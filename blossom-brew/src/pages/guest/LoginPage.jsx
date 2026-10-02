import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '../../services/authService'

function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [touched, setTouched] = useState({})
  const [loginError, setLoginError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function validate(values) {
    const errors = {}

    if (!values.email.trim()) {
      errors.email = 'Vui lòng nhập email.'
    } else if (!/^\S+@\S+\.\S+$/.test(values.email)) {
      errors.email = 'Email không đúng định dạng.'
    }

    if (!values.password) {
      errors.password = 'Vui lòng nhập mật khẩu.'
    }

    return errors
  }

  const errors = validate(form)
  const isFormValid = Object.keys(errors).length === 0 && !loginError

  function handleChange(event) {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))

    setTouched((currentTouched) => ({
      ...currentTouched,
      [name]: true,
    }))

    setLoginError('')
    setSuccess('')
  }

  function handleBlur(event) {
    setTouched((currentTouched) => ({
      ...currentTouched,
      [event.target.name]: true,
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    setTouched({ email: true, password: true })

    if (!isFormValid) return

    const result = loginUser(form)

    if (!result.ok) {
      setLoginError(result.message)
      return
    }

    setSuccess(`Đăng nhập thành công. Chào ${result.user.name}!`)

    const destination =
      result.user.role === 'cashier'
        ? '/cashier'
        : result.user.role === 'admin'
          ? '/admin'
          : '/customer'

    window.setTimeout(() => navigate(destination), 600)
  }

  return (
    <main className="register-page auth-page">
      <Link className="auth-brand" to="/" aria-label="Về trang chủ Blossom Brew">
        <span>B</span>
        Blossom Brew
      </Link>

      <section className="register-card">
        <p className="eyebrow">Welcome back</p>
        <h1>Đăng nhập.</h1>

        <p className="register-lead">
          Đăng nhập để đặt món, quản lý đơn hàng và tích điểm thành viên.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label>
            EMAIL <span className="required-mark">*</span>
            <input
              className={touched.email && errors.email ? 'input-error' : ''}
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="name@email.com"
            />
            {touched.email && errors.email && (
              <span className="field-error">{errors.email}</span>
            )}
          </label>

          <label>
            MẬT KHẨU <span className="required-mark">*</span>
            <div className="password-field">
              <input
                className={
                  touched.password && (errors.password || loginError)
                    ? 'input-error'
                    : ''
                }
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Nhập mật khẩu"
              />
              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
            {touched.password && (errors.password || loginError) && (
              <span className="field-error">
                {errors.password || loginError}
              </span>
            )}
          </label>

          {success && <p className="form-success">{success}</p>}

          <button
            className="primary-button full-button"
            type="submit"
            disabled={!isFormValid}
          >
            Đăng nhập
          </button>

          <p className="forgot-password-link">
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </p>
        </form>

        <p className="login-helper">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </section>
    </main>
  )
}

export default LoginPage
