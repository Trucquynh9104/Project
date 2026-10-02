import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { resetUserPassword } from '../../services/authService'

const DEMO_OTP = '123456'

function userExists(email) {
  try {
    const users = JSON.parse(localStorage.getItem('blossom-brew-users') || '[]')
    return users.some((user) => user.email === email.trim().toLowerCase())
  } catch {
    return false
  }
}

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function clearFeedback() {
    setError('')
    setMessage('')
  }

  function submitEmail(event) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Email không đúng định dạng.')
      return
    }

    if (!userExists(normalizedEmail)) {
      setError('Không tìm thấy tài khoản với email này.')
      return
    }

    setEmail(normalizedEmail)
    setStep(2)
    setMessage('Mã xác thực đã được gửi đến email của bạn.')
  }

  function submitOtp(event) {
    event.preventDefault()

    if (otp !== DEMO_OTP) {
      setError('Mã xác thực chưa đúng.')
      return
    }

    setStep(3)
    setMessage('Xác thực thành công. Hãy đặt mật khẩu mới.')
  }

  function submitPassword(event) {
    event.preventDefault()

    if (password.length < 8) {
      setError('Mật khẩu cần ít nhất 8 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu chưa khớp.')
      return
    }

    const result = resetUserPassword({ email, newPassword: password })

    if (!result.ok) {
      setError(result.message || 'Không thể đặt lại mật khẩu.')
      return
    }

    setStep(4)
    setError('')
    setMessage('Đặt lại mật khẩu thành công.')
  }

  return (
    <main className="register-page forgot-password-page">
      <Link className="back-link" to="/login">← Quay lại đăng nhập</Link>

      <section className="register-card forgot-password-card">
        <p className="eyebrow">Account recovery</p>
        <h1>Quên mật khẩu.</h1>
        <p className="register-lead">Khôi phục quyền truy cập tài khoản Blossom Brew.</p>

        <div className="forgot-steps" aria-label="Các bước đặt lại mật khẩu">
          {[1, 2, 3].map((item) => <span className={item <= step ? 'active' : ''} key={item}>{item}</span>)}
        </div>

        {step === 1 && <form onSubmit={submitEmail} noValidate>
          <label>EMAIL<input type="email" value={email} onChange={(event) => { setEmail(event.target.value); clearFeedback() }} placeholder="name@email.com" autoFocus /></label>
          <p className="forgot-helper">Nhập email bạn đã dùng để đăng ký tài khoản.</p>
          {error && <p className="field-error">{error}</p>}
          <button className="primary-button full-button" type="submit">Gửi mã xác thực</button>
        </form>}

        {step === 2 && <form onSubmit={submitOtp} noValidate>
          <label>MÃ XÁC THỰC<input inputMode="numeric" maxLength="6" value={otp} onChange={(event) => { setOtp(event.target.value.replace(/\D/g, '')); clearFeedback() }} placeholder="Nhập 6 chữ số" autoFocus /></label>
          <p className="forgot-helper">Mã đã gửi đến <strong>{email}</strong>. Bản demo dùng mã: <b>123456</b>.</p>
          {error && <p className="field-error">{error}</p>}
          <button className="primary-button full-button" type="submit">Xác nhận mã</button>
          <button className="forgot-text-button" type="button" onClick={() => { setStep(1); clearFeedback() }}>Đổi địa chỉ email</button>
        </form>}

        {step === 3 && <form onSubmit={submitPassword} noValidate>
          <label>MẬT KHẨU MỚI<input type="password" value={password} onChange={(event) => { setPassword(event.target.value); clearFeedback() }} placeholder="Ít nhất 8 ký tự" autoFocus /></label>
          <label>XÁC NHẬN MẬT KHẨU<input type="password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); clearFeedback() }} placeholder="Nhập lại mật khẩu mới" /></label>
          {error && <p className="field-error">{error}</p>}
          <button className="primary-button full-button" type="submit">Đặt lại mật khẩu</button>
        </form>}

        {step === 4 && <div className="forgot-success"><span>✓</span><h2>Mật khẩu đã được thay đổi.</h2><p>Bạn có thể đăng nhập lại bằng mật khẩu mới.</p><button className="primary-button full-button" type="button" onClick={() => navigate('/login')}>Đi đến đăng nhập</button></div>}

        {message && step < 4 && <p className="form-success">{message}</p>}
      </section>
    </main>
  )
}

export default ForgotPasswordPage
