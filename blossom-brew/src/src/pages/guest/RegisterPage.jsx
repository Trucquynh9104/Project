import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../../services/authService'

function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [touched, setTouched] = useState({})
  const [registerError, setRegisterError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  function validate(values) {
    const errors = {}

    if (!values.name.trim()) {
      errors.name = 'Vui lòng nhập họ và tên.'
    }

    if (!values.email.trim()) {
      errors.email = 'Vui lòng nhập email.'
    } else if (!/^\S+@\S+\.\S+$/.test(values.email)) {
      errors.email = 'Email không đúng định dạng.'
    }

    if (!values.password) {
      errors.password = 'Vui lòng nhập mật khẩu.'
    } else if (values.password.length < 8) {
      errors.password = 'Mật khẩu cần tối thiểu 8 ký tự.'
    }

    if (!values.confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.'
    } else if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Xác nhận mật khẩu chưa khớp.'
    }

    return errors
  }

  const errors = validate(form)
  const isFormValid = Object.keys(errors).length === 0 && !registerError

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

    if (name === 'email') {
      setRegisterError('')
    }

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

    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    })

    if (!isFormValid) return

    const result = registerUser(form)

    if (!result.ok) {
      setRegisterError(result.message)
      return
    }

    setSuccess('Đăng ký thành công. Tài khoản của bạn đã được lưu.')

    window.setTimeout(() => {
      navigate('/customer')
    }, 700)
  }

  return (
    <main className="register-page">
      <Link className="back-link" to="/">
        ← Quay lại thực đơn
      </Link>

      <section className="register-card">
        <p className="eyebrow">Join Blossom Brew</p>
        <h1>Trở thành thành viên.</h1>

        <p className="register-lead">
          Đăng ký để bắt đầu tích điểm và nhận ưu đãi dành riêng cho bạn.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label>
            HỌ VÀ TÊN <span className="required-mark">*</span>

            <input
              className={touched.name && errors.name ? 'input-error' : ''}
              name="name"
              value={form.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Nhập họ và tên"
            />

            {touched.name && errors.name && (
              <span className="field-error">{errors.name}</span>
            )}
          </label>

          <label>
            EMAIL <span className="required-mark">*</span>

            <input
              className={
                touched.email && (errors.email || registerError)
                  ? 'input-error'
                  : ''
              }
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="name@email.com"
            />

            {touched.email && (errors.email || registerError) && (
              <span className="field-error">
                {errors.email || registerError}
              </span>
            )}
          </label>

          <label>
            MẬT KHẨU <span className="required-mark">*</span>

            <div className="password-field">
              <input
                className={
                  touched.password && errors.password ? 'input-error' : ''
                }
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Tối thiểu 8 ký tự"
              />

              <button
                className="password-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>

            {touched.password && errors.password && (
              <span className="field-error">{errors.password}</span>
            )}
          </label>

          <label>
            XÁC NHẬN MẬT KHẨU <span className="required-mark">*</span>

            <div className="password-field">
              <input
                className={
                  touched.confirmPassword && errors.confirmPassword
                    ? 'input-error'
                    : ''
                }
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Nhập lại mật khẩu"
              />

              <button
                className="password-toggle"
                type="button"
                onClick={() =>
                  setShowConfirmPassword((current) => !current)
                }
              >
                {showConfirmPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>

            {touched.confirmPassword && errors.confirmPassword && (
              <span className="field-error">
                {errors.confirmPassword}
              </span>
            )}
          </label>

          {success && <p className="form-success">{success}</p>}

          <button
            className="primary-button full-button"
            type="submit"
            disabled={!isFormValid}
          >
            Tạo tài khoản
          </button>
        </form>

        <p className="login-helper">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </section>
    </main>
  )
}

export default RegisterPage