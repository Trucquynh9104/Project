import { store } from "../../services/dataStore";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  getMembershipLabel,
  logoutUser,
} from "../../services/authService";
import NotificationDropdown from "../../components/NotificationDropdown";
import CustomerAvatar from "../../components/CustomerAvatar";
import {
  getNotificationLabel,
  getNotificationsForUser,
  initializeNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from "../../services/notificationService";

const navigationItems = [
  { icon: "⌂", label: "Tổng quan", to: "/customer" },
  { icon: "⌁", label: "Menu & đặt món", to: "/customer/menu" },
  { icon: "□", label: "Giỏ hàng", to: "/customer/cart" },
  { icon: "◇", label: "Điểm & voucher", to: "/customer/points" },
  { icon: "◷", label: "Lịch sử đơn hàng", to: "/customer/history" },
  { icon: "✦", label: "Thông báo", to: "/customer/notices", active: true },
  { icon: "?", label: "Hỗ trợ", to: "/customer/support" },
  { icon: "☷", label: "Thông tin cá nhân", to: "/customer/profile" },
];

const ITEMS_PER_PAGE = 5;

function ListFooter({
  currentPage,
  itemLabel,
  onPageChange,
  totalItems,
  totalPages,
}) {
  const buttonStyle = {
    background: "#fff",
    border: "1px solid #dfcfc3",
    color: "#765747",
    height: "26px",
    width: "26px",
    fontSize: "14px",
  };

  return (
    <div
      style={{
        alignItems: "center",
        borderTop: "1px solid #eadfd5",
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        justifyContent: "space-between",
        minHeight: "42px",
        padding: "0 12px",
      }}
    >
      <span style={{ color: "#806858", fontSize: "11px" }}>
        Tổng số {itemLabel}:{" "}
        <strong style={{ color: "#50382c" }}>{totalItems}</strong>
      </span>
      <div style={{ alignItems: "center", display: "flex", gap: "6px" }}>
        <button
          aria-label="Trang trước"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          style={{
            ...buttonStyle,
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            opacity: currentPage === 1 ? 0.4 : 1,
          }}
          type="button"
        >
          {"<"}
        </button>
        <span style={{ color: "#806858", fontSize: "11px" }}>
          Trang {currentPage} / {totalPages}
        </span>
        <button
          aria-label="Trang sau"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          style={{
            ...buttonStyle,
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            opacity: currentPage === totalPages ? 0.4 : 1,
          }}
          type="button"
        >
          {">"}
        </button>
      </div>
    </div>
  );
}

function getCartCount() {
  try {
    const cart = JSON.parse(store.getItem("blossom-cart") || "[]");
    return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  } catch {
    return 0;
  }
}

function CustomerNoticesPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const notificationUserId = user?.id || "";
  const notificationUserRole = user?.role || "";
  const [notices, setNotices] = useState(() => getNotificationsForUser(user));
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    function refreshNotices() {
      initializeNotifications();
      setNotices(
        getNotificationsForUser(
          notificationUserId
            ? { id: notificationUserId, role: notificationUserRole }
            : null,
        ),
      );
    }

    refreshNotices();
    return subscribeNotifications(refreshNotices);
  }, [notificationUserId, notificationUserRole]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const unreadCount = notices.filter((notice) => !notice.read).length;
  const totalPages = Math.max(1, Math.ceil(notices.length / ITEMS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedNotices = notices.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE,
  );
  const membershipLabel = getMembershipLabel(user.points);

  function openNotice(notice) {
    markNotificationRead(user, notice.id);
    if (notice.to) navigate(notice.to);
  }

  function handleMarkAllRead() {
    setNotices(markAllNotificationsRead(user));
  }

  async function handleLogout() {
    await logoutUser();
    navigate("/");
  }

  return (
    <div className="bb-dashboard">
      <aside className="bb-sidebar">
        <button
          className="bb-brand"
          type="button"
          onClick={() => navigate("/customer")}
        >
          <span>B</span>
          Blossom Brew
        </button>

        <p className="bb-sidebar-label">Customer space</p>

        <nav className="bb-sidebar-nav">
          {navigationItems.map((item) => (
            <button
              className={item.active ? "bb-nav-item active" : "bb-nav-item"}
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="bb-sidebar-profile">
          <span className="bb-avatar">{initials}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{membershipLabel}</small>
          </div>
          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="bb-main">
        <header className="bb-topbar">
          <span>THÔNG BÁO</span>
          <div className="bb-topbar-actions">
            <NotificationDropdown />
            <button
              className="bb-cart-button"
              type="button"
              onClick={() => navigate("/customer/cart")}
            >
              Giỏ hàng <b>{getCartCount()}</b>
            </button>
            <CustomerAvatar />
          </div>
        </header>

        <section className="bb-content">
          <div className="bb-page-heading">
            <div>
              <p className="bb-eyebrow">For you</p>
              <h1>Cập nhật từ Blossom Brew.</h1>
              <p className="bb-subtitle">
                Ưu đãi và thông tin mới được gửi đến tài khoản của bạn.
              </p>
            </div>

            <button
              className="outline-button"
              disabled={!unreadCount}
              type="button"
              onClick={handleMarkAllRead}
            >
              Đánh dấu đã đọc
            </button>
          </div>

          <div className="bb-notice-list">
            {paginatedNotices.map((notice, index) => (
              <button
                className={
                  notice.read ? "bb-notice-item" : "bb-notice-item unread"
                }
                key={notice.id}
                type="button"
                onClick={() => openNotice(notice)}
              >
                <span className="bb-notice-number">
                  {String(
                    (activePage - 1) * ITEMS_PER_PAGE + index + 1,
                  ).padStart(2, "0")}
                </span>

                <span className="bb-notice-copy">
                  <strong>{notice.title}</strong>
                  <small>{notice.content}</small>
                </span>

                <time>{getNotificationLabel(notice)}</time>
                {!notice.read && <i className="bb-notice-unread-dot" />}
              </button>
            ))}

            <ListFooter
              currentPage={activePage}
              itemLabel="thông báo"
              onPageChange={setCurrentPage}
              totalItems={notices.length}
              totalPages={totalPages}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export default CustomerNoticesPage;
