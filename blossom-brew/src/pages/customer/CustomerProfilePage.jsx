import { store } from "../../services/dataStore";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  getMembershipLabel,
  logoutUser,
  updateUserProfile,
} from "../../services/authService";
import NotificationDropdown from "../../components/NotificationDropdown";
import CustomerAvatar from "../../components/CustomerAvatar";

const navigationItems = [
  { icon: "⌂", label: "Tổng quan", to: "/customer" },
  { icon: "⌁", label: "Menu & đặt món", to: "/customer/menu" },
  { icon: "□", label: "Giỏ hàng", to: "/customer/cart" },
  { icon: "◇", label: "Điểm & voucher", to: "/customer/points" },
  { icon: "◷", label: "Lịch sử đơn hàng", to: "/customer/history" },
  { icon: "✦", label: "Thông báo", to: "/customer/notices" },
  {
    icon: "☷",
    label: "Thông tin cá nhân",
    to: "/customer/profile",
    active: true,
  },
];

function getCartCount() {
  try {
    const cart = JSON.parse(store.getItem("blossom-cart") || "[]");

    return cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
  } catch {
    return 0;
  }
}

function CustomerProfilePage() {
  const navigate = useNavigate();
  const initialUser = getCurrentUser();

  const [user, setUser] = useState(initialUser);
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const membershipLabel = getMembershipLabel(user.points);

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage("");
    setMessageType("");
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessageType("error");
      setMessage("Vui lòng chọn file ảnh.");
      return;
    }

    if (file.size > 700 * 1024) {
      setMessageType("error");
      setMessage("Ảnh cần nhỏ hơn 700KB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setForm((current) => ({
        ...current,
        avatar: reader.result,
      }));
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
      setMessage(result.message);
      return;
    }

    setUser(result.user);
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
          {user.avatar ? (
            <img
              className="bb-avatar bb-avatar-image"
              src={user.avatar}
              alt={user.name}
            />
          ) : (
            <span className="bb-avatar">{initials}</span>
          )}

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
          <span>THÔNG TIN CÁ NHÂN</span>

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
          <p className="bb-eyebrow">My account</p>
          <h1>Thông tin cá nhân.</h1>

          <div className="bb-profile-layout">
            <aside className="bb-profile-summary">
              {form.avatar ? (
                <img
                  className="bb-profile-avatar"
                  src={form.avatar}
                  alt="Ảnh đại diện"
                />
              ) : (
                <span className="bb-profile-avatar">{initials}</span>
              )}

              <strong>{form.name || "Chưa có tên"}</strong>
              <small>
                {membershipLabel} · {Number(user.points || 0)} điểm
              </small>

              <label className="bb-avatar-upload">
                Thay ảnh đại diện
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </label>
            </aside>

            <form className="bb-profile-form" onSubmit={handleSubmit}>
              <h2>Cập nhật tài khoản</h2>

              <label>
                HỌ VÀ TÊN
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
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
                <input value={user.email} disabled />
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
                <p className={`bb-profile-message ${messageType}`}>{message}</p>
              )}

              <div className="bb-profile-actions">
                <button className="primary-button" type="submit">
                  {isChangingPassword ? "Lưu mật khẩu mới" : "Lưu thay đổi"}
                </button>
                <button
                  className="bb-profile-action"
                  type="button"
                  onClick={handleTogglePasswordChange}
                >
                  {isChangingPassword ? "Hủy đổi mật khẩu" : "Đổi mật khẩu"}
                </button>
                <button
                  className="bb-profile-action"
                  type="button"
                  onClick={handleForgotPassword}
                >
                  Quên mật khẩu?
                </button>
                <button
                  className="bb-profile-action bb-profile-logout-button"
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

export default CustomerProfilePage;
