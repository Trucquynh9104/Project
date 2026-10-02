import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  getCurrentUser,
  logoutUser,
  updateUserProfile,
} from '../../services/authService'

function CashierProfilePage() {
  const navigate = useNavigate()
  const initialUser = getCurrentUser()
  const [currentUser, setCurrentUser] = useState(initialUser)
  const [form, setForm] = useState({
    name: initialUser?.name || '',
    phone: initialUser?.phone || '',
    avatar: initialUser?.avatar || '',
  })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  if (!currentUser || currentUser.role !== 'cashier') {
    return <Navigate to="/login" replace />
  }

  const initials = (form.name || currentUser.name)
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  function setFormMessage(type, text) {
    setMessageType(type)
    setMessage(text)
  }

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({ ...current, [name]: value }))
    setMessage('')
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setFormMessage('error', 'Vui lòng chọn file ảnh hợp lệ.')
      event.target.value = ''
      return
    }

    if (file.size > 700 * 1024) {
      setFormMessage('error', 'Ảnh cần nhỏ hơn 700KB.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setForm((current) => ({ ...current, avatar: reader.result }))
      setMessage('')
    }

    reader.readAsDataURL(file)
  }

  function removeAvatar() {
    setForm((current) => ({ ...current, avatar: '' }))
    setMessage('')
  }

  function handleSubmit(event) {
    event.preventDefault()

    const name = form.name.trim()
    const phone = form.phone.replace(/\s/g, '')

    if (!name) {
      setFormMessage('error', 'Vui lòng nhập họ và tên.')
      return
    }

    if (phone && !/^(0\d{9}|\+84\d{9})$/.test(phone)) {
      setFormMessage('error', 'Số điện thoại chưa đúng định dạng.')
      return
    }

    const result = updateUserProfile({
      name,
      phone,
      avatar: form.avatar,
    })

    if (!result.ok) {
      setFormMessage('error', result.message || 'Không thể lưu thông tin.')
      return
    }

    setCurrentUser(result.user)
    setForm({
      name: result.user.name,
      phone: result.user.phone || '',
      avatar: result.user.avatar || '',
    })
    setFormMessage('success', 'Đã lưu thông tin cá nhân.')
  }

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  return (
    <div className="cashier-dashboard">
      <aside className="cashier-sidebar">
        <button className="cashier-brand" type="button" onClick={() => navigate('/')}>
          <span>B</span>
          Blossom Brew
        </button>

        <p className="cashier-sidebar-label">Cashier workspace</p>

        <nav className="cashier-nav">
          <button className="cashier-nav-item" type="button" onClick={() => navigate('/cashier')}>
            <span>▥</span>
            Tạo đơn tại quầy
          </button>
          <button className="cashier-nav-item" type="button" onClick={() => navigate('/cashier/orders')}>
            <span>□</span>
            Quản lý đơn hàng
          </button>
          <button className="cashier-nav-item" type="button" onClick={() => navigate('/cashier/shift')}>
            <span>◌</span>
            Ca làm việc
          </button>
          <button className="cashier-nav-item" type="button" onClick={() => navigate('/cashier/notices')}>
            <span>✦</span>
            Thông báo
          </button>
          <button className="cashier-nav-item active" type="button">
            <span>☷</span>
            Thông tin cá nhân
          </button>
        </nav>

        <div className="cashier-profile">
          {currentUser.avatar ? (
            <img className="cashier-avatar cashier-avatar-image" src={currentUser.avatar} alt={currentUser.name} />
          ) : (
            <span className="cashier-avatar">{initials}</span>
          )}
          <div>
            <strong>{currentUser.name}</strong>
            <small>Cashier · Ca sáng</small>
          </div>
          <button type="button" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </aside>

      <main className="cashier-main">
        <section className="cashier-content">
          <div className="cashier-heading">
            <div>
              <p className="cashier-eyebrow">My account</p>
              <h1>Thông tin cá nhân.</h1>
              <p>Cập nhật thông tin hiển thị cho tài khoản thu ngân.</p>
            </div>
          </div>

          <div className="cashier-profile-layout">
            <aside className="cashier-profile-summary">
              {form.avatar ? (
                <img className="cashier-profile-avatar" src={form.avatar} alt="Ảnh đại diện" />
              ) : (
                <span className="cashier-profile-avatar">{initials}</span>
              )}
              <strong>{form.name.trim() || 'Chưa có tên'}</strong>
              <small>{currentUser.email}</small>
              <small>Cashier · Ca sáng</small>

              <label className="cashier-avatar-upload">
                Thay ảnh đại diện
                <input type="file" accept="image/*" onChange={handleAvatarChange} />
              </label>

              {form.avatar && (
                <button className="cashier-remove-avatar" type="button" onClick={removeAvatar}>
                  Xóa ảnh
                </button>
              )}
            </aside>

            <form className="cashier-profile-form" onSubmit={handleSubmit} noValidate>
              <h2>Cập nhật tài khoản</h2>
              <label>
                HỌ VÀ TÊN
                <input name="name" value={form.name} onChange={handleChange} placeholder="Nhập họ và tên" />
              </label>
              <label>
                SỐ ĐIỆN THOẠI
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="Ví dụ: 0901234567" />
              </label>
              <label>
                EMAIL
                <input value={currentUser.email} disabled />
              </label>
              {message && <p className={`cashier-profile-message ${messageType}`}>{message}</p>}
              <button className="cashier-save-button" type="submit">Lưu thay đổi</button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}

export default CashierProfilePage
