import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  getCurrentUser,
  logoutUser,
  updateUserProfile,
} from '../../services/authService'
import NotificationDropdown from '../../components/NotificationDropdown'
import CustomerAvatar from '../../components/CustomerAvatar'

const navigationItems = [
  { icon: '⌂', label: 'Tổng quan', to: '/customer' },
  { icon: '⌁', label: 'Menu & đặt món', to: '/customer/menu' },
  { icon: '□', label: 'Giỏ hàng', to: '/customer/cart' },
  { icon: '◇', label: 'Điểm & voucher', to: '/customer/points' },
  { icon: '◷', label: 'Lịch sử đơn hàng', to: '/customer/history' },
  { icon: '✦', label: 'Thông báo', to: '/customer/notices' },
  {
    icon: '☷',
    label: 'Thông tin cá nhân',
    to: '/customer/profile',
    active: true,
  },
]

function getCartCount() {
  try {
    const cart = JSON.parse(localStorage.getItem('blossom-cart') || '[]')

    return cart.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0,
    )
  } catch {
    return 0
  }
}

function CustomerProfilePage() {
  const navigate = useNavigate()
  const initialUser = getCurrentUser()

  const [user, setUser] = useState(initialUser)
  const [form, setForm] = useState({
    name: initialUser?.name || '',
    phone: initialUser?.phone || '',
    avatar: initialUser?.avatar || '',
  })
  const [message, setMessage] = useState('')

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setMessage('')
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage('Vui lòng chọn file ảnh.')
      return
    }

    if (file.size > 700 * 1024) {
      setMessage('Ảnh cần nhỏ hơn 700KB.')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setForm((current) => ({
        ...current,
        avatar: reader.result,
      }))
    }

    reader.readAsDataURL(file)
  }

  function handleSubmit(event) {
    event.preventDefault()

    const result = updateUserProfile(form)

    if (!result.ok) {
      setMessage(result.message)
      return
    }

    setUser(result.user)
    setMessage('Đã lưu thông tin cá nhân.')
  }

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  return (
    <div className="bb-dashboard">
      <aside className="bb-sidebar">
        <button
          className="bb-brand"
          type="button"
          onClick={() => navigate('/')}
        >
          <span>B</span>
          Blossom Brew
        </button>

        <p className="bb-sidebar-label">Customer space</p>

        <nav className="bb-sidebar-nav">
          {navigationItems.map((item) => (
            <button
              className={item.active ? 'bb-nav-item active' : 'bb-nav-item'}
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
            <small>Silver member</small>
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
              onClick={() => navigate('/customer/cart')}
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

              <strong>{form.name || 'Chưa có tên'}</strong>
              <small>Silver member · {Number(user.points || 0)} điểm</small>

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

              {message && <p className="bb-profile-message">{message}</p>}

              <button className="primary-button" type="submit">
                Lưu thay đổi
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  )
}

export default CustomerProfilePage
