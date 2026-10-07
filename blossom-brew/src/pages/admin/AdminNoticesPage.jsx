import NoticeComposer from "../../components/NoticeComposer";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getCurrentUser, logoutUser } from "../../services/authService";
import {
  getNotificationLabel,
  getNotificationsForUser,
  initializeNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from "../../services/notificationService";

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

function AdminNoticesPage() {
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

  const totalPages = Math.max(1, Math.ceil(notices.length / ITEMS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedNotices = notices.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE,
  );

  if (!user || user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const unreadCount = notices.filter((notice) => !notice.read).length;

  const navItems = [
    { icon: "⌂", label: "Tổng quan", to: "/admin" },
    { icon: "⌁", label: "Quản lý menu", to: "/admin/products" },
    { icon: "□", label: "Đơn hàng", to: "/admin/orders" },
    { icon: "○", label: "Thành viên", to: "/admin/members" },
    { icon: "◇", label: "Voucher", to: "/admin/vouchers" },
    { icon: "♙", label: "Tài khoản thu ngân", to: "/admin/cashiers" },
    { icon: "◷", label: "Ca làm việc", to: "/admin/shifts" },
    { icon: "☆", label: "Đánh giá", to: "/admin/feedback" },
    { icon: "?", label: "Yêu cầu hỗ trợ", to: "/admin/support" },
    { icon: "↗", label: "Báo cáo", to: "/admin/reports" },
    {
      icon: "✦",
      label: "Thông báo",
      to: "/admin/notices",
      active: true,
    },
    { icon: "○", label: "Thông tin cá nhân", to: "/admin/profile" },
  ];

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
    <div className="admin-dashboard admin-notices-page">
      <aside className="admin-sidebar">
        <button
          className="admin-brand"
          type="button"
          onClick={() => navigate("/admin")}
        >
          <span>B</span>
          Blossom Brew
        </button>

        <p className="admin-sidebar-label">Admin workspace</p>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <button
              className={
                item.active ? "admin-nav-item active" : "admin-nav-item"
              }
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
            >
              <span>{item.icon}</span>
              {item.label}

              {item.active && unreadCount > 0 && (
                <b className="admin-notice-count">{unreadCount}</b>
              )}
            </button>
          ))}
        </nav>

        <div className="admin-profile">
          <span className="admin-avatar">{initials}</span>

          <div>
            <strong>{user.name}</strong>
            <small>Administrator</small>
          </div>

          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-page-title">
            <h1>Thông báo vận hành.</h1>
            <p>Cập nhật các hoạt động cần theo dõi trong cửa hàng.</p>
          </div>
          <span>
            {new Intl.DateTimeFormat("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(new Date())}
          </span>
        </header>

        <section className="admin-content">
          <div className="admin-notices-heading">
            <div>
              <p className="admin-eyebrow">Updates</p>
              <h1>Thông báo.</h1>
              <p>Cập nhật hoạt động quan trọng của cửa hàng.</p>
            </div>

            <button
              className="admin-export-button"
              type="button"
              disabled={!unreadCount}
              onClick={handleMarkAllRead}
            >
              Đánh dấu tất cả là đã đọc
            </button>
          </div>

          <NoticeComposer />
          <section className="admin-notice-list">
            {paginatedNotices.map((notice, index) => (
              <button
                className={
                  notice.read ? "admin-notice-item" : "admin-notice-item unread"
                }
                key={notice.id}
                type="button"
                onClick={() => openNotice(notice)}
              >
                <span className="admin-notice-number">
                  {String(
                    (activePage - 1) * ITEMS_PER_PAGE + index + 1,
                  ).padStart(2, "0")}
                </span>

                <span className="admin-notice-copy">
                  <strong>{notice.title}</strong>
                  <small>{notice.content}</small>
                </span>

                <span className="admin-notice-time">
                  {getNotificationLabel(notice)}
                </span>

                {!notice.read && <i className="admin-unread-dot" />}
              </button>
            ))}
            <ListFooter
              currentPage={activePage}
              itemLabel="thông báo"
              onPageChange={setCurrentPage}
              totalItems={notices.length}
              totalPages={totalPages}
            />
          </section>
        </section>
      </main>
    </div>
  );
}

export default AdminNoticesPage;
