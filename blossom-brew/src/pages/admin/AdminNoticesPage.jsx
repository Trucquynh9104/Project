import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../../services/authService'

const NOTICES_KEY = 'blossom-admin-notices'

const defaultNotices = [
  {
    id: 'admin-notice-1',
    title: 'Đơn hàng mới cần theo dõi',
    content: 'Có đơn hàng mới được tạo và đang chờ xác nhận.',
    time: 'Vừa xong',
    read: false,
  },
  {
    id: 'admin-notice-2',
    title: 'Voucher sắp hết hạn',
    content: 'Voucher BBSILVER sẽ hết hạn trong tháng này.',
    time: '30 phút trước',
    read: false,
  },
  {
    id: 'admin-notice-3',
    title: 'Cập nhật điểm thành viên',
    content: 'Điểm của thành viên được cộng sau khi đơn hàng hoàn tất.',
    time: 'Hôm nay',
    read: true,
  },
  {
    id: 'admin-notice-4',
    title: 'Báo cáo bán hàng đã sẵn sàng',
    content: 'Bạn có thể xem thống kê doanh thu tại trang Báo cáo.',
    time: 'Hôm qua',
    read: true,
  },
]

function loadNotices() {
  try {
    const saved = localStorage.getItem(NOTICES_KEY)

    if (saved) return JSON.parse(saved)
  } catch {
    // Dùng dữ liệu mẫu nếu localStorage lỗi.
  }

  localStorage.setItem(NOTICES_KEY, JSON.stringify(defaultNotices))
  return defaultNotices
}

function AdminNoticesPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [notices, setNotices] = useState(loadNotices)

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  const unreadCount = notices.filter((notice) => !notice.read).length

  const navItems = [
    { icon: '⌂', label: 'Tổng quan', to: '/admin' },
    { icon: '⌁', label: 'Quản lý menu', to: '/admin/products' },
    { icon: '□', label: 'Đơn hàng', to: '/admin/orders' },
    { icon: '○', label: 'Thành viên', to: '/admin/members' },
    { icon: '◇', label: 'Voucher', to: '/admin/vouchers' },
    { icon: '♙', label: 'Tài khoản thu ngân', to: '/admin/cashiers' },
    { icon: '↗', label: 'Báo cáo', to: '/admin/reports' },
    {
      icon: '✦',
      label: 'Thông báo',
      to: '/admin/notices',
      active: true,
    },
    { icon: '○', label: 'Thông tin cá nhân', to: '/admin/profile' },
  ]

  function saveNotices(updatedNotices) {
    setNotices(updatedNotices)
    localStorage.setItem(NOTICES_KEY, JSON.stringify(updatedNotices))
  }

  function markRead(id) {
    saveNotices(
      notices.map((notice) =>
        notice.id === id ? { ...notice, read: true } : notice,
      ),
    )
  }

  function markAllRead() {
    saveNotices(
      notices.map((notice) => ({
        ...notice,
        read: true,
      })),
    )
  }

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  return (
    <div className="admin-dashboard admin-notices-page">
      <aside className="admin-sidebar">
        <button
          className="admin-brand"
          type="button"
          onClick={() => navigate('/admin')}
        >
          <span>B</span>
          Blossom Brew
        </button>

        <p className="admin-sidebar-label">Admin workspace</p>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <button
              className={
                item.active ? 'admin-nav-item active' : 'admin-nav-item'
              }
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
            >
              <span>{item.icon}</span>
              {item.label}

              {item.active && unreadCount > 0 && (
                <b className="admin-notice-count">{unreadCount}</b>
              )}
            </button>
          ))}
        </nav>

        <div className="admin-profile">
          <span className="admin-avatar">{initials}</span>

          <div>
            <strong>{user.name}</strong>
            <small>Administrator</small>
          </div>

          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <span>THÔNG BÁO</span>
        </header>

        <section className="admin-content">
          <div className="admin-notices-heading">
            <div>
              <p className="admin-eyebrow">Updates</p>
              <h1>Thông báo.</h1>
              <p>Cập nhật hoạt động quan trọng của cửa hàng.</p>
            </div>

            <button
              className="admin-export-button"
              type="button"
              disabled={!unreadCount}
              onClick={markAllRead}
            >
              Đánh dấu đã đọc
            </button>
          </div>

          <section className="admin-notice-list">
            {notices.map((notice, index) => (
              <button
                className={
                  notice.read
                    ? 'admin-notice-item'
                    : 'admin-notice-item unread'
                }
                key={notice.id}
                type="button"
                onClick={() => markRead(notice.id)}
              >
                <span className="admin-notice-number">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="admin-notice-copy">
                  <strong>{notice.title}</strong>
                  <small>{notice.content}</small>
                </span>

                <span className="admin-notice-time">{notice.time}</span>

                {!notice.read && <i className="admin-unread-dot" />}
              </button>
            ))}
          </section>
        </section>
      </main>
    </div>
  )
}

export default AdminNoticesPage