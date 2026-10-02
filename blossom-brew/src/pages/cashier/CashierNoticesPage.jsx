import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../../services/authService'

const ORDERS_KEY = 'blossom-orders'

function getNoticesKey(cashierId) {
  return `blossom-cashier-notices-${cashierId}`
}

function getShiftKey(cashierId) {
  return `blossom-cashier-current-shift-${cashierId}`
}

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]')
  } catch {
    return []
  }
}

function getShift(cashierId) {
  try {
    return JSON.parse(localStorage.getItem(getShiftKey(cashierId)) || 'null')
  } catch {
    return null
  }
}

function formatTime(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value))
}

function getDefaultNotices(user) {
  const shift = getShift(user.id)
  const orders = getOrders()
    .filter((order) => !order.cashierId || order.cashierId === user.id)
    .slice(0, 5)

  const orderNotices = orders.map((order) => ({
    id: `order-${order.id}`,
    title:
      order.status === 'Hoàn tất'
        ? `Đơn ${order.id} đã hoàn tất`
        : `Đơn ${order.id} cần xử lý`,
    content:
      order.status === 'Hoàn tất'
        ? `Đơn ${order.product || ''} đã được hoàn tất.`
        : `Đơn ${order.product || ''} hiện ở trạng thái ${order.status || 'Đang pha'}.`,
    time: formatTime(order.createdAt),
    createdAt: order.createdAt || new Date().toISOString(),
    target: 'orders',
    read: false,
  }))

  const voucherNotices = orders
    .filter((order) => order.voucherCode)
    .slice(0, 2)
    .map((order) => ({
      id: `voucher-${order.id}`,
      title: `Voucher ${order.voucherCode} đã được sử dụng`,
      content: `Voucher được áp dụng trong đơn ${order.id} tại quầy.`,
      time: formatTime(order.createdAt),
      createdAt: order.createdAt || new Date().toISOString(),
      target: 'orders',
      read: false,
    }))

  const shiftNotice = shift
    ? [
        {
          id: `shift-${shift.id}`,
          title: shift.status === 'open' ? `${shift.name} đang mở` : `${shift.name} đã đóng`,
          content:
            shift.status === 'open'
              ? `Ca làm việc bắt đầu lúc ${formatTime(shift.openedAt)}.`
              : `Ca làm việc kết thúc lúc ${formatTime(shift.closedAt)}.`,
          time: formatTime(shift.status === 'open' ? shift.openedAt : shift.closedAt),
          createdAt: shift.status === 'open' ? shift.openedAt : shift.closedAt,
          target: 'shift',
          read: true,
        },
      ]
    : []

  return [...orderNotices, ...voucherNotices, ...shiftNotice]
}

function loadNotices(user) {
  let savedNotices = []

  try {
    savedNotices = JSON.parse(
      localStorage.getItem(getNoticesKey(user.id)) || '[]',
    )
  } catch {
    savedNotices = []
  }

  const savedById = new Map(savedNotices.map((notice) => [notice.id, notice]))
  const currentNotices = getDefaultNotices(user).map((notice) => ({
    ...notice,
    read: savedById.get(notice.id)?.read ?? notice.read,
  }))

  localStorage.setItem(
    getNoticesKey(user.id),
    JSON.stringify(currentNotices),
  )

  return currentNotices
}

function CashierNoticesPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [notices, setNotices] = useState(() => (user ? loadNotices(user) : []))

  const unreadCount = useMemo(
    () => notices.filter((notice) => !notice.read).length,
    [notices],
  )

  if (!user || user.role !== 'cashier') {
    return <Navigate to="/login" replace />
  }

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()

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

    if (notice.target === 'orders') {
      navigate('/cashier/orders')
    }

    if (notice.target === 'shift') {
      navigate('/cashier/shift')
    }
  }

  function markAllAsRead() {
    saveNotices(notices.map((notice) => ({ ...notice, read: true })))
  }

  function refreshNotices() {
    setNotices(loadNotices(user))
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
          <button className="cashier-nav-item active" type="button">
            <span>✦</span>
            Thông báo
            {unreadCount > 0 && <b className="cashier-notice-count">{unreadCount}</b>}
          </button>
          <button className="cashier-nav-item" type="button" onClick={() => navigate('/cashier/profile')}>
            <span>☷</span>
            Thông tin cá nhân
          </button>
        </nav>

        <div className="cashier-profile">
          <span className="cashier-avatar">{initials}</span>
          <div>
            <strong>{user.name}</strong>
            <small>Cashier · Ca sáng</small>
          </div>
          <button type="button" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </aside>

      <main className="cashier-main">
        <section className="cashier-content">
          <div className="cashier-heading">
            <div>
              <p className="cashier-eyebrow">Updates</p>
              <h1>Thông báo.</h1>
              <p>Cập nhật hoạt động liên quan đến ca làm và đơn hàng.</p>
            </div>
            <div className="cashier-heading-actions">
              <button className="cashier-outline-button" type="button" onClick={refreshNotices}>
                Làm mới
              </button>
              <button className="cashier-outline-button" type="button" disabled={!unreadCount} onClick={markAllAsRead}>
                Đánh dấu đã đọc
              </button>
            </div>
          </div>

          <section className="cashier-notice-list">
            {notices.map((notice, index) => (
              <button
                className={notice.read ? 'cashier-notice-item' : 'cashier-notice-item unread'}
                key={notice.id}
                type="button"
                onClick={() => openNotice(notice)}
              >
                <span className="cashier-notice-number">{(index + 1).toString().padStart(2, '0')}</span>
                <span className="cashier-notice-copy"><strong>{notice.title}</strong><small>{notice.content}</small></span>
                <span className="cashier-notice-time">{notice.time}</span>
                {!notice.read && <i className="cashier-unread-dot" />}
              </button>
            ))}

            {!notices.length && (
              <p className="cashier-orders-empty">Chưa có thông báo nào.</p>
            )}
          </section>
        </section>
      </main>
    </div>
  )
}

export default CashierNoticesPage
