import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import CashierShell from '../../components/CashierShell'
import { getCurrentUser, updateUserProfile } from '../../services/authService'

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()
}

function CashierProfilePage() {
  const initialUser = getCurrentUser()
  const [currentUser, setCurrentUser] = useState(initialUser)
  const [form, setForm] = useState({
    name: initialUser?.name || '',
    phone: initialUser?.phone || '',
    password: '',
  })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  if (!currentUser || currentUser.role !== 'cashier') {
    return <Navigate to="/login" replace />
  }

  const initials = getInitials(form.name || currentUser.name)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setMessage('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    const name = form.name.trim()
    const phone = form.phone.replace(/\s/g, '')

    if (!name) {
      setMessageType('error')
      setMessage('Vui lòng nhập họ và tên.')
      return
    }
    if (phone && !/^(0\d{9}|\+84\d{9})$/.test(phone)) {
      setMessageType('error')
      setMessage('Số điện thoại chưa đúng định dạng.')
      return
    }
    if (form.password && form.password.length < 8) {
      setMessageType('error')
      setMessage('Mật khẩu mới cần có ít nhất 8 ký tự.')
      return
    }

    const result = updateUserProfile({
      name,
      phone,
      avatar: currentUser.avatar || '',
      password: form.password,
    })
    if (!result.ok) {
      setMessageType('error')
      setMessage(result.message || 'Không thể lưu thông tin.')
      return
    }

    setCurrentUser(result.user)
    setForm({ name: result.user.name, phone: result.user.phone || '', password: '' })
    setMessageType('success')
    setMessage('Đã lưu thay đổi.')
  }

  return (
    <CashierShell active="profile" topbarTitle="Thông tin cá nhân." user={currentUser}>
      <section className="cashier-content cashier-profile-content">
        <div className="cashier-profile-layout">
          <aside className="cashier-profile-summary">
            {currentUser.avatar ? (
              <img className="cashier-profile-avatar" src={currentUser.avatar} alt={currentUser.name} />
            ) : (
              <span className="cashier-profile-avatar">{initials}</span>
            )}
            <strong>{form.name.trim() || 'Chưa có tên'}</strong>
            <small>Cashier · Cửa hàng Quận 1</small>
            <div className="cashier-current-shift">
              <span>Ca hiện tại</span>
              <b>Ca sáng · 08:00 – 16:00</b>
            </div>
          </aside>

          <form className="cashier-profile-form" onSubmit={handleSubmit} noValidate>
            <h2>Cập nhật tài khoản</h2>
            <div className="cashier-profile-fields">
              <label>
                Họ và tên
                <input name="name" value={form.name} placeholder="Nhập họ và tên" onChange={handleChange} />
              </label>
              <label>
                Số điện thoại
                <input name="phone" value={form.phone} placeholder="090 888 6677" onChange={handleChange} />
              </label>
              <label>
                Email
                <input value={currentUser.email} disabled />
              </label>
              <label>
                Mật khẩu mới
                <input name="password" type="password" value={form.password} placeholder="••••••••" onChange={handleChange} />
              </label>
            </div>
            {message && <p className={`cashier-profile-message ${messageType}`}>{message}</p>}
            <button className="cashier-save-button" type="submit">Lưu thay đổi</button>
          </form>
        </div>
      </section>
    </CashierShell>
  )
}

export default CashierProfilePage
