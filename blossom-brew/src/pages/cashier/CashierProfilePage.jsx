import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import CashierShell from "../../components/CashierShell";
import {
  getCurrentUser,
  logoutUser,
  updateUserProfile,
} from "../../services/authService";

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();
}

function CashierProfilePage() {
  const navigate = useNavigate();
  const initialUser = getCurrentUser();
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [form, setForm] = useState({
    name: initialUser?.name || "",
    phone: initialUser?.phone || "",
    password: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  if (!currentUser || currentUser.role !== "cashier") {
    return <Navigate to="/login" replace />;
  }

  const initials = getInitials(form.name || currentUser.name);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.replace(/\s/g, "");

    if (!name) {
      setMessageType("error");
      setMessage("Vui lòng nhập họ và tên.");
      return;
    }
    if (phone && !/^(0\d{9}|\+84\d{9})$/.test(phone)) {
      setMessageType("error");
      setMessage("Số điện thoại chưa đúng định dạng.");
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
      name,
      phone,
      avatar: currentUser.avatar || "",
      password: isChangingPassword ? form.password : "",
    });
    if (!result.ok) {
      setMessageType("error");
      setMessage(result.message || "Không thể lưu thông tin.");
      return;
    }

    setCurrentUser(result.user);
    setForm({
      name: result.user.name,
      phone: result.user.phone || "",
      password: "",
      confirmPassword: "",
    });
    setIsChangingPassword(false);
    setMessageType("success");
    setMessage(
      isChangingPassword
        ? "Đã đổi mật khẩu và lưu thông tin cá nhân."
        : "Đã lưu thay đổi.",
    );
  }

  function handleTogglePasswordChange() {
    setIsChangingPassword((current) => !current);
    setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
    setMessage("");
  }

  async function handleForgotPassword() {
    navigate("/forgot-password");
  }

  async function handleLogout() {
    if (!window.confirm("Bạn có chắc muốn đăng xuất?")) return;
    await logoutUser();
    navigate("/");
  }

  return (
    <CashierShell
      active="profile"
      topbarTitle="Thông tin cá nhân."
      user={currentUser}
    >
      <section className="cashier-content cashier-profile-content">
        <div className="cashier-profile-layout">
          <aside className="cashier-profile-summary">
            {currentUser.avatar ? (
              <img
                className="cashier-profile-avatar"
                src={currentUser.avatar}
                alt={currentUser.name}
              />
            ) : (
              <span className="cashier-profile-avatar">{initials}</span>
            )}
            <strong>{form.name.trim() || "Chưa có tên"}</strong>
            <small>Cashier · Cửa hàng Quận 1</small>
            <div className="cashier-current-shift">
              <span>Ca hiện tại</span>
              <b>Ca sáng · 08:00 – 16:00</b>
            </div>
          </aside>

          <form
            autoComplete="off"
            className="cashier-profile-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <h2>Cập nhật tài khoản</h2>
            <div className="cashier-profile-fields">
              <label>
                Họ và tên
                <input
                  autoComplete="name"
                  name="name"
                  value={form.name}
                  placeholder="Nhập họ và tên"
                  onChange={handleChange}
                />
              </label>
              <label>
                Số điện thoại
                <input
                  autoComplete="tel-national"
                  inputMode="tel"
                  name="phone"
                  placeholder="090 888 6677"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                />
              </label>
              <label>
                Email
                <input
                  autoComplete="email"
                  disabled
                  value={currentUser.email}
                />
              </label>
              {isChangingPassword && (
                <>
                  <label>
                    Mật khẩu mới
                    <input
                      autoComplete="new-password"
                      name="password"
                      placeholder="Ít nhất 8 ký tự"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Xác nhận mật khẩu mới
                    <input
                      autoComplete="new-password"
                      name="confirmPassword"
                      placeholder="Nhập lại mật khẩu mới"
                      type="password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                    />
                  </label>
                </>
              )}
            </div>
            {message && (
              <p className={`cashier-profile-message ${messageType}`}>
                {message}
              </p>
            )}
            <div className="cashier-profile-actions">
              <button className="cashier-save-button" type="submit">
                {isChangingPassword ? "Lưu mật khẩu mới" : "Lưu thay đổi"}
              </button>
              <button
                className="cashier-profile-action"
                type="button"
                onClick={handleTogglePasswordChange}
              >
                {isChangingPassword ? "Hủy đổi mật khẩu" : "Đổi mật khẩu"}
              </button>
              <button
                className="cashier-profile-action"
                type="button"
                onClick={handleForgotPassword}
              >
                Quên mật khẩu?
              </button>
              <button
                className="cashier-profile-action cashier-profile-logout-button"
                type="button"
                onClick={handleLogout}
              >
                Đăng xuất
              </button>
            </div>
          </form>
        </div>
      </section>
    </CashierShell>
  );
}

export default CashierProfilePage;
