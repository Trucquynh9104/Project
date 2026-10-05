import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../services/authService'
import { getNotificationsForUser, initializeNotifications, subscribeNotifications } from '../services/notificationService'

const navigationItems = [
  { id: 'pos', label: 'Tạo đơn tại quầy', path: '/cashier', icon: '▥' },
  { id: 'orders', label: 'Quản lý đơn hàng', path: '/cashier/orders', icon: '□' },
  { id: 'shift', label: 'Ca làm việc', path: '/cashier/shift', icon: '◌' },
  { id: 'notices', label: 'Thông báo', path: '/cashier/notices', icon: '✦' },
  { id: 'profile', label: 'Thông tin cá nhân', path: '/cashier/profile', icon: '○' },
]

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()
}

function CashierShell({
  active,
  children,
  className = '',
  topbarDescription,
  topbarLabel,
  topbarTitle,
  user,
}) {
  const navigate = useNavigate()
  const initials = getInitials(user?.name)
  const notificationUserId = user?.id || ''
  const notificationUserRole = user?.role || ''
  const [unreadCount, setUnreadCount] = useState(() => getNotificationsForUser(user).filter((notice) => !notice.read).length)

  useEffect(() => {
    function refreshUnreadCount() {
      initializeNotifications()
      setUnreadCount(getNotificationsForUser(notificationUserId ? { id: notificationUserId, role: notificationUserRole } : null).filter((notice) => !notice.read).length)
    }

    refreshUnreadCount()
    return subscribeNotifications(refreshUnreadCount)
  }, [notificationUserId, notificationUserRole])

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  return (
    <div className={`cashier-dashboard ${className}`.trim()}>
      <aside className="cashier-sidebar">
        <button
          className="cashier-brand"
          type="button"
          onClick={() => navigate('/')}
        >
          <span>B</span>
          Blossom Brew
        </button>

        <p className="cashier-sidebar-label">Cashier workspace</p>

        <nav className="cashier-nav" aria-label="Điều hướng thu ngân">
          {navigationItems.map((item) => (
            <button
              className={`cashier-nav-item ${active === item.id ? 'active' : ''}`}
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
              {item.id === 'notices' && unreadCount > 0 && <i aria-label={`${unreadCount} thông báo chưa đọc`} className="cashier-nav-notice-dot" />}
            </button>
          ))}
        </nav>

        <div className="cashier-profile">
          <button
            className="cashier-profile-identity"
            type="button"
            onClick={() => navigate('/cashier/profile')}
          >
            {user?.avatar ? (
              <img className="cashier-avatar cashier-avatar-image" src={user.avatar} alt="" />
            ) : (
              <span className="cashier-avatar">{initials}</span>
            )}
            <span>
              <strong>{user?.name}</strong>
              <small>Cashier · Ca sáng</small>
            </span>
          </button>
          <button className="cashier-logout" type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="cashier-main">
        <header className={`cashier-topbar ${topbarTitle ? 'with-title' : ''}`}>
          <div className="cashier-topbar-copy">
            {topbarLabel && <p>{topbarLabel}</p>}
            {topbarTitle && <h1>{topbarTitle}</h1>}
            {topbarDescription && <span>{topbarDescription}</span>}
          </div>
          <span className="cashier-shift-status">● Ca sáng đang mở</span>
        </header>
        {children}
      </main>
    </div>
  )
}

export default CashierShell
