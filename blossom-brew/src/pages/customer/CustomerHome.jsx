import { store } from "../../services/dataStore";
import { Navigate, useNavigate } from "react-router-dom";
import CustomerAvatar from "../../components/CustomerAvatar";
import NotificationDropdown from "../../components/NotificationDropdown";
import RoleGuestHome from "../../components/RoleGuestHome";
import {
  getCurrentUser,
  getMembershipLabel,
  logoutUser,
} from "../../services/authService";

const navigationItems = [
  { icon: "⌂", label: "Tổng quan", to: "/customer", active: true },
  { icon: "⌁", label: "Menu & đặt món", to: "/customer/menu" },
  { icon: "□", label: "Giỏ hàng", to: "/customer/cart" },
  { icon: "◇", label: "Điểm & voucher", to: "/customer/points" },
  { icon: "◷", label: "Lịch sử đơn hàng", to: "/customer/history" },
  { icon: "✦", label: "Thông báo", to: "/customer/notices" },
  { icon: "?", label: "Hỗ trợ", to: "/customer/support" },
  { icon: "☷", label: "Thông tin cá nhân", to: "/customer/profile" },
];

function getCartCount() {
  try {
    return JSON.parse(store.getItem("blossom-cart") || "[]").reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );
  } catch {
    return 0;
  }
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();
}

function CustomerHome() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  if (!user || user.role !== "customer")
    return <Navigate to="/login" replace />;

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
          <span>B</span>Blossom Brew
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
          <span className="bb-avatar">{getInitials(user.name)}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{getMembershipLabel(user.points)}</small>
          </div>
          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="bb-main">
        <header className="bb-topbar">
          <span>TRANG CHỦ</span>
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
        <section className="bb-content role-home-content">
          <RoleGuestHome role="customer" />
        </section>
      </main>
    </div>
  );
}

export default CustomerHome;
