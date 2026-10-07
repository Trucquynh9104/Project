import { Navigate, useNavigate } from "react-router-dom";
import RoleGuestHome from "../../components/RoleGuestHome";
import { getCurrentUser, logoutUser } from "../../services/authService";

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
  { icon: "✦", label: "Thông báo", to: "/admin/notices" },
  { icon: "○", label: "Thông tin cá nhân", to: "/admin/profile" },
];

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();
}

function AdminHomePage() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  if (!user || user.role !== "admin") return <Navigate to="/login" replace />;

  async function handleLogout() {
    await logoutUser();
    navigate("/");
  }

  return (
    <div className="admin-dashboard admin-role-home">
      <aside className="admin-sidebar">
        <button
          className="admin-brand"
          type="button"
          onClick={() => navigate("/admin")}
        >
          <span>B</span> Blossom Brew
        </button>
        <p className="admin-sidebar-label">Admin workspace</p>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <button
              className="admin-nav-item"
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="admin-profile">
          <span className="admin-avatar">{getInitials(user.name)}</span>
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
          <span>TRANG CHỦ</span>
        </header>
        <section className="admin-content role-home-content">
          <RoleGuestHome role="admin" />
        </section>
      </main>
    </div>
  );
}

export default AdminHomePage;
