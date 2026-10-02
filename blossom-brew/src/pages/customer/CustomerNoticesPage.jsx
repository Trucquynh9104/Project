import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../../services/authService'
import NotificationDropdown from '../../components/NotificationDropdown'
import CustomerAvatar from '../../components/CustomerAvatar'

const navigationItems = [
  { icon: '⌂', label: 'Tổng quan', to: '/customer' },
  { icon: '⌁', label: 'Menu & đặt món', to: '/customer/menu' },
  { icon: '□', label: 'Giỏ hàng', to: '/customer/cart' },
  { icon: '◇', label: 'Điểm & voucher', to: '/customer/points' },
  { icon: '◷', label: 'Lịch sử đơn hàng', to: '/customer/history' },
  { icon: '✦', label: 'Thông báo', to: '/customer/notices', active: true },
  { icon: '☷', label: 'Thông tin cá nhân', to: '/customer/profile' },
]

function getCartCount() {
  try {
    const cart = JSON.parse(localStorage.getItem('blossom-cart') || '[]')
    return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  } catch {
    return 0
  }
}

function getNoticesKey(userId) {
  return `blossom-customer-notices-${userId}`
}

function loadNotices(userId) {
  const key = getNoticesKey(userId)

  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null')
    if (saved) return saved
  } catch {
    // Dùng dữ liệu mẫu nếu localStorage không đọc được.
  }

  const defaultNotices = [
    {
      id: 'welcome',
      title: 'Chào mừng bạn đến Blossom Brew',
      content: 'Khám phá menu và những ưu đãi dành riêng cho thành viên.',
      time: 'Hôm nay',
      read: false,
      to: '/customer/menu',
    },
    {
      id: 'voucher',
      title: 'Ưu đãi thành viên',
      content: 'Theo dõi điểm và đổi voucher trực tiếp trên trang Điểm & voucher.',
      time: 'Hôm nay',
      read: false,
      to: '/customer/points',
    },
    {
      id: 'history',
      title: 'Theo dõi đơn hàng dễ dàng',
      content: 'Mọi trạng thái xử lý đơn sẽ được cập nhật tại Lịch sử đơn hàng.',
      time: 'Hôm nay',
      read: true,
      to: '/customer/history',
    },
  ]

  localStorage.setItem(key, JSON.stringify(defaultNotices))
  return defaultNotices
}

function CustomerNoticesPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [notices, setNotices] = useState(() =>
    user ? loadNotices(user.id) : [],
  )

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  const unreadCount = notices.filter((notice) => !notice.read).length
  const membershipLabel =
    Number(user.points || 0) >= 1000
      ? 'Gold member'
      : Number(user.points || 0) >= 50
        ? 'Silver member'
        : 'Member'

  function saveNotices(updatedNotices) {
    setNotices(updatedNotices)
    localStorage.setItem(
      getNoticesKey(user.id),
      JSON.stringify(updatedNotices),
    )
  }

  function openNotice(notice) {
    saveNotices(
      notices.map((item) =>
        item.id === notice.id ? { ...item, read: true } : item,
      ),
    )

    if (notice.to) navigate(notice.to)
  }

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  return (
    <div className="bb-dashboard">
      <aside className="bb-sidebar">
        <button className="bb-brand" type="button" onClick={() => navigate('/')}>
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
          <span className="bb-avatar">{initials}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{membershipLabel}</small>
          </div>
          <button type="button" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </aside>

      <main className="bb-main">
        <header className="bb-topbar">
          <span>THÔNG BÁO</span>
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
          <div className="bb-page-heading">
            <div>
              <p className="bb-eyebrow">For you</p>
              <h1>Cập nhật từ Blossom Brew.</h1>
              <p className="bb-subtitle">
                Ưu đãi và thông tin mới được gửi đến tài khoản của bạn.
              </p>
            </div>

            <button
              className="outline-button"
              disabled={!unreadCount}
              type="button"
              onClick={() =>
                saveNotices(notices.map((item) => ({ ...item, read: true })))
              }
            >
              Đánh dấu đã đọc
            </button>
          </div>

          <div className="bb-notice-list">
            {notices.map((notice, index) => (
              <button
                className={notice.read ? 'bb-notice-item' : 'bb-notice-item unread'}
                key={notice.id}
                type="button"
                onClick={() => openNotice(notice)}
              >
                <span className="bb-notice-number">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="bb-notice-copy">
                  <strong>{notice.title}</strong>
                  <small>{notice.content}</small>
                </span>

                <time>{notice.time}</time>
                {!notice.read && <i className="bb-notice-unread-dot" />}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default CustomerNoticesPage
