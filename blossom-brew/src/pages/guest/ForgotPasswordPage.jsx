import { useState } from "react";
import { Link } from "react-router-dom";
import { request } from "../../services/dataStore";
export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1),
    [email, setEmail] = useState(""),
    [otp, setOtp] = useState(""),
    [demoCode, setCode] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setError("");
    if (step === 1 && !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Email không đúng định dạng.");
      return;
    }
    if (step === 3 && (password.length < 8 || password !== confirm)) {
      setError("Mật khẩu cần ít nhất 8 ký tự và xác nhận phải khớp.");
      return;
    }
    setBusy(true);
    const r = await request(
      step === 1
        ? "/api/recovery-start"
        : step === 2
          ? "/api/recovery-verify"
          : "/api/recovery-reset",
      step === 1
        ? { email }
        : step === 2
          ? { code: otp }
          : { newPassword: password },
    );
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    if (r.demoCode) setCode(r.demoCode);
    setStep(step + 1);
  }
  return (
    <main className="register-page forgot-password-page">
      <Link className="back-link" to="/login">
        Quay lại đăng nhập
      </Link>
      <section className="register-card forgot-password-card">
        <p className="eyebrow">Account recovery</p>
        <h1>Quên mật khẩu.</h1>
        <p className="register-lead">
          Khôi phục quyền truy cập tài khoản Blossom Brew.
        </p>
        <div className="forgot-steps">
          {[1, 2, 3].map((v) => (
            <span key={v} className={v <= step ? "active" : ""}>
              {v}
            </span>
          ))}
        </div>
        {step < 4 ? (
          <form onSubmit={submit}>
            {step === 1 ? (
              <label>
                Email *
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            ) : step === 2 ? (
              <>
                <label>
                  Mã xác thực *
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  />
                </label>
                <p className="forgot-helper">
                  Mô phỏng OTP, không gửi email thật. Mã: <b>{demoCode}</b> ·
                  hiệu lực 5 phút, tối đa 5 lần thử.
                </p>
              </>
            ) : (
              <>
                <label>
                  Mật khẩu mới *
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <label>
                  Xác nhận mật khẩu *
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </label>
              </>
            )}
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary-button full-button" disabled={busy}>
              {busy
                ? "Đang xử lý…"
                : step === 1
                  ? "Gửi mã mô phỏng"
                  : step === 2
                    ? "Xác nhận mã"
                    : "Đặt lại mật khẩu"}
            </button>
          </form>
        ) : (
          <div className="forgot-success">
            <h2>Mật khẩu đã được thay đổi.</h2>
            <Link className="brew-button" to="/login">
              Đăng nhập lại
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
