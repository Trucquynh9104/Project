import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  logoutUser,
  updateUserProfile,
} from "../../services/authService";

function AdminProfilePage() {
  const navigate = useNavigate();
  const initialUser = getCurrentUser();
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [form, setForm] = useState({
    name: initialUser?.name || "",
    phone: initialUser?.phone || "",
    avatar: initialUser?.avatar || "",
    password: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  if (!currentUser || currentUser.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  const initials = currentUser.name
    .split(" ")
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const navItems = [
    { icon: "⌂", label: "Tổng quan", to: "/admin" },
    { icon: "⌁", label: "Quản lý menu", to: "/admin/products" },
    { icon: "□", label: "Đơn hàng", to: "/admin/orders" },
    { icon: "◦", label: "Thành viên", to: "/admin/members" },
    { icon: "◇", label: "Voucher", to: "/admin/vouchers" },
    { icon: "♙", label: "Tài khoản thu ngân", to: "/admin/cashiers" },
    { icon: "◷", label: "Ca làm việc", to: "/admin/shifts" },
    { icon: "☆", label: "Đánh giá", to: "/admin/feedback" },
    { icon: "?", label: "Yêu cầu hỗ trợ", to: "/admin/support" },
    { icon: "↗", label: "Báo cáo", to: "/admin/reports" },
    { icon: "✦", label: "Thông báo", to: "/admin/notices" },
    {
      icon: "○",
      label: "Thông tin cá nhân",
      to: "/admin/profile",
      active: true,
    },
  ];

  async function handleLogout() {
    if (!window.confirm("Bạn có chắc muốn đăng xuất?")) return;
    await logoutUser();
    navigate("/");
  }

  function handleTogglePasswordChange() {
    setIsChangingPassword((current) => !current);
    setForm((current) => ({
      ...current,
      password: "",
      confirmPassword: "",
    }));
    setMessage("");
    setMessageType("");
  }

  async function handleForgotPassword() {
    navigate("/forgot-password");
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
    setMessageType("");
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessageType("error");
      setMessage("Vui lòng chọn đúng định dạng ảnh.");
      return;
    }

    if (file.size > 700 * 1024) {
      setMessageType("error");
      setMessage("Ảnh cần nhỏ hơn 700KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, avatar: reader.result }));
      setMessage("");
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setMessageType("error");
      setMessage("Vui lòng nhập họ và tên.");
      return;
    }

    if (isChangingPassword && !form.password) {
      setMessageType("error");
      setMessage("Vui lòng nhập mật khẩu mới.");
      return;
    }

    if (isChangingPassword && form.password.length < 8) {
      setMessageType("error");
      setMessage("Mật khẩu mới cần có ít nhất 8 ký tự.");
      return;
    }

    if (isChangingPassword && form.password !== form.confirmPassword) {
      setMessageType("error");
      setMessage("Xác nhận mật khẩu chưa khớp.");
      return;
    }

    if (
      !window.confirm(
        isChangingPassword
          ? "Xác nhận đổi mật khẩu và lưu thông tin?"
          : "Xác nhận lưu thay đổi thông tin cá nhân?",
      )
    )
      return;

    const result = await updateUserProfile({
      name: form.name,
      phone: form.phone,
      avatar: form.avatar,
      password: isChangingPassword ? form.password : "",
    });

    if (!result.ok) {
      setMessageType("error");
      setMessage(result.message || "Không thể lưu thay đổi.");
      return;
    }

    setCurrentUser(result.user);
    setForm((current) => ({
      ...current,
      name: result.user.name,
      phone: result.user.phone || "",
      avatar: result.user.avatar || "",
      password: "",
      confirmPassword: "",
    }));
    setIsChangingPassword(false);
    setMessageType("success");
    setMessage(
      isChangingPassword
        ? "Đã đổi mật khẩu và lưu thông tin cá nhân."
        : "Đã lưu thông tin cá nhân.",
    );
  }

  return (
    <div className="admin-dashboard admin-profile-page">
      <aside className="admin-sidebar">
        <button
          className="admin-brand"
          type="button"
          onClick={() => navigate("/admin")}
        >
          <span>B</span>Blossom Brew
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
            </button>
          ))}
        </nav>
        <div className="admin-profile">
          {currentUser.avatar ? (
            <img
              className="admin-avatar admin-avatar-image"
              src={currentUser.avatar}
              alt={currentUser.name}
            />
          ) : (
            <span className="admin-avatar">{initials}</span>
          )}
          <div>
            <strong>{currentUser.name}</strong>
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
            <h1>Thông tin cá nhân.</h1>
            <p>Quản lý tài khoản quản trị viên của Blossom Brew.</p>
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
          <div className="admin-profile-heading">
            <p className="admin-eyebrow">My account</p>
            <h1>Thông tin cá nhân.</h1>
            <p>Cập nhật thông tin hiển thị cho tài khoản quản trị.</p>
          </div>

          <div className="admin-profile-layout">
            <aside className="admin-profile-summary">
              {form.avatar ? (
                <img
                  className="admin-profile-avatar"
                  src={form.avatar}
                  alt="Ảnh đại diện"
                />
              ) : (
                <span className="admin-profile-avatar">{initials}</span>
              )}
              <strong>{form.name || "Chưa có tên"}</strong>
              <small>{currentUser.email}</small>
              <span>Administrator</span>
              <label className="admin-avatar-upload">
                Thay ảnh đại diện
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </label>
            </aside>

            <form className="admin-profile-form" onSubmit={handleSubmit}>
              <h2>Cập nhật tài khoản</h2>
              <label>
                HỌ VÀ TÊN
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Nhập họ và tên"
                />
              </label>
              <label>
                SỐ ĐIỆN THOẠI
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Nhập số điện thoại"
                />
              </label>
              <label>
                EMAIL
                <input value={currentUser.email} disabled />
              </label>
              {isChangingPassword && (
                <>
                  <label>
                    MẬT KHẨU MỚI
                    <input
                      autoComplete="new-password"
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Ít nhất 8 ký tự"
                    />
                  </label>
                  <label>
                    XÁC NHẬN MẬT KHẨU MỚI
                    <input
                      autoComplete="new-password"
                      name="confirmPassword"
                      type="password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </label>
                </>
              )}
              {message && (
                <p className={`admin-form-message ${messageType}`}>{message}</p>
              )}
              <div className="admin-profile-actions">
                <button className="admin-primary-button" type="submit">
                  {isChangingPassword ? "Lưu mật khẩu mới" : "Lưu thay đổi"}
                </button>
                <button
                  className="admin-profile-action"
                  type="button"
                  onClick={handleTogglePasswordChange}
                >
                  {isChangingPassword ? "Hủy đổi mật khẩu" : "Đổi mật khẩu"}
                </button>
                <button
                  className="admin-profile-action"
                  type="button"
                  onClick={handleForgotPassword}
                >
                  Quên mật khẩu?
                </button>
                <button
                  className="admin-profile-action admin-profile-logout-button"
                  type="button"
                  onClick={handleLogout}
                >
                  Đăng xuất
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminProfilePage;
