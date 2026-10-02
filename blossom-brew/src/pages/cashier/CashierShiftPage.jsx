import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../../services/authService'

const ORDERS_KEY = 'blossom-orders'
const SHIFT_HISTORY_KEY = 'blossom-cashier-shift-history'

function getShiftKey(cashierId) {
  return `blossom-cashier-current-shift-${cashierId}`
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString('vi-VN')}đ`
}

function formatDateTime(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]')
  } catch {
    return []
  }
}

function createShift(user) {
  return {
    id: `shift-${Date.now()}`,
    cashierId: user.id,
    cashierName: user.name,
    name: 'Ca sáng',
    status: 'open',
    openedAt: new Date().toISOString(),
    closedAt: null,
  }
}

function loadShift(user) {
  const shiftKey = getShiftKey(user.id)

  try {
    const savedShift = JSON.parse(localStorage.getItem(shiftKey) || 'null')

    if (savedShift?.cashierId === user.id) {
      return savedShift
    }
  } catch {
    // Tạo lại ca mới nếu localStorage cũ bị lỗi định dạng.
  }

  const newShift = createShift(user)
  localStorage.setItem(shiftKey, JSON.stringify(newShift))
  return newShift
}

function CashierShiftPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [shift, setShift] = useState(() => (user ? loadShift(user) : null))
  const [orders, setOrders] = useState(getOrders)
  const [message, setMessage] = useState('')

  const shiftOrders = useMemo(() => {
    if (!shift || !user) return []

    const openedAt = new Date(shift.openedAt).getTime()
    const closedAt = shift.closedAt
      ? new Date(shift.closedAt).getTime()
      : Number.POSITIVE_INFINITY

    return orders.filter((order) => {
      const createdAt = new Date(order.createdAt).getTime()
      const belongsToCashier = !order.cashierId || order.cashierId === user.id

      return belongsToCashier && createdAt >= openedAt && createdAt <= closedAt
    })
  }, [orders, shift, user])

  const completedOrders = useMemo(
    () => shiftOrders.filter((order) => order.status === 'Hoàn tất'),
    [shiftOrders],
  )

  const revenue = useMemo(
    () =>
      completedOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0,
      ),
    [completedOrders],
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

  function saveShift(updatedShift) {
    localStorage.setItem(getShiftKey(user.id), JSON.stringify(updatedShift))
    setShift(updatedShift)
  }

  function saveShiftToHistory(closedShift) {
    let history = []

    try {
      history = JSON.parse(localStorage.getItem(SHIFT_HISTORY_KEY) || '[]')
    } catch {
      history = []
    }

    const newHistory = [
      ...history.filter((item) => item.id !== closedShift.id),
      closedShift,
    ]

    localStorage.setItem(SHIFT_HISTORY_KEY, JSON.stringify(newHistory))
  }

  function handleShiftAction() {
    if (shift.status === 'open') {
      const confirmed = window.confirm('Bạn có muốn kết thúc ca hiện tại không?')
      if (!confirmed) return

      const closedShift = {
        ...shift,
        status: 'closed',
        closedAt: new Date().toISOString(),
      }

      saveShift(closedShift)
      saveShiftToHistory(closedShift)
      setMessage('Đã kết thúc ca và lưu báo cáo ca làm việc.')
      return
    }

    const newShift = createShift(user)
    saveShift(newShift)
    setOrders(getOrders())
    setMessage('Đã mở ca mới.')
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
          <button className="cashier-nav-item active" type="button">
            <span>◌</span>
            Ca làm việc
          </button>
          <button className="cashier-nav-item" type="button" onClick={() => navigate('/cashier/notices')}>
            <span>✦</span>
            Thông báo
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
            <small>Cashier · {shift?.name || 'Ca sáng'}</small>
          </div>
          <button type="button" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </aside>

      <main className="cashier-main">
        <section className="cashier-content">
          <div className="cashier-heading">
            <div>
              <p className="cashier-eyebrow">Work shift</p>
              <h1>Ca làm việc.</h1>
              <p>Theo dõi hoạt động và tổng kết ca làm tại quầy.</p>
            </div>
            <span className={shift.status === 'open' ? 'cashier-shift-badge open' : 'cashier-shift-badge closed'}>
              ● {shift.status === 'open' ? 'Ca đang mở' : 'Ca đã đóng'}
            </span>
          </div>

          <section className="cashier-shift-card">
            <div>
              <p className="cashier-eyebrow">{shift.name}</p>
              <h2>{shift.status === 'open' ? 'Ca sáng đang mở.' : 'Ca sáng đã kết thúc.'}</h2>
              <p>
                {shift.status === 'open'
                  ? `Bắt đầu lúc ${formatDateTime(shift.openedAt)}`
                  : `Từ ${formatDateTime(shift.openedAt)} đến ${formatDateTime(shift.closedAt)}`}
              </p>
            </div>
            <button className="cashier-shift-action" type="button" onClick={handleShiftAction}>
              {shift.status === 'open' ? 'Kết thúc ca' : 'Mở ca mới'}
            </button>
          </section>

          <section className="cashier-shift-summary">
            <article><span>Đơn đã tạo trong ca</span><strong>{shiftOrders.length.toString().padStart(2, '0')}</strong></article>
            <article><span>Đơn hoàn tất</span><strong>{completedOrders.length.toString().padStart(2, '0')}</strong></article>
            <article><span>Doanh thu đã hoàn tất</span><strong>{formatPrice(revenue)}</strong></article>
          </section>

          <section className="cashier-shift-note">
            <p className="cashier-eyebrow">Lưu ý</p>
            <p>Chỉ đơn có trạng thái <strong>Hoàn tất</strong> mới được tính vào doanh thu ca.</p>
          </section>

          {message && <p className="cashier-message">{message}</p>}
        </section>
      </main>
    </div>
  )
}

export default CashierShiftPage
