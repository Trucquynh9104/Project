import { useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../../services/authService'
import NotificationDropdown from '../../components/NotificationDropdown'
import CustomerAvatar from '../../components/CustomerAvatar'

const navigationItems = [
  { icon: '⌂', label: 'Tổng quan', to: '/customer', active: true },
  { icon: '⌁', label: 'Menu & đặt món', to: '/customer/menu' },
  { icon: '□', label: 'Giỏ hàng', to: '/customer/cart' },
  { icon: '◇', label: 'Điểm & voucher', to: '/customer/points' },
  { icon: '◷', label: 'Lịch sử đơn hàng', to: '/customer/history' },
  { icon: '✦', label: 'Thông báo', to: '/customer/notices' },
  { icon: '☷', label: 'Thông tin cá nhân', to: '/customer/profile' },
]

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString('vi-VN')}đ`
}

function getCartCount() {
  try {
    return JSON.parse(localStorage.getItem('blossom-cart') || '[]').reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    )
  } catch {
    return 0
  }
}

function getStatusGroup(status) {
  if (status === 'Hoàn tất') return 'completed'
  if (status === 'Đã hủy') return 'cancelled'
  return 'incomplete'
}

function CustomerHome() {
  const navigate = useNavigate()
  const user = getCurrentUser()

  const orders = useMemo(() => {
    if (!user) return []
    try {
      return JSON.parse(localStorage.getItem('blossom-orders') || '[]')
        .filter((order) => order.member?.id === user.id || (!order.member?.id && order.receiver === user.name))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    } catch {
      return []
    }
  }, [user])

  if (!user) return <Navigate to="/login" replace />

  const initials = user.name.split(' ').map((part) => part[0]).slice(-2).join('').toUpperCase()
  const points = Number(user.points || 0)
  const nextTier = Math.max(1000 - points, 0)

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  return (
    <div className="bb-dashboard">
      <aside className="bb-sidebar">
        <button className="bb-brand" type="button" onClick={() => navigate('/')}><span>B</span>Blossom Brew</button>
        <p className="bb-sidebar-label">Customer space</p>
        <nav className="bb-sidebar-nav">
          {navigationItems.map((item) => <button className={item.active ? 'bb-nav-item active' : 'bb-nav-item'} key={item.label} type="button" onClick={() => navigate(item.to)}><span>{item.icon}</span>{item.label}</button>)}
        </nav>
        <div className="bb-sidebar-profile"><span className="bb-avatar">{initials}</span><div><strong>{user.name}</strong><small>Silver member</small></div><button type="button" onClick={handleLogout}>Đăng xuất</button></div>
      </aside>

      <main className="bb-main">
        <header className="bb-topbar"><span>TỔNG QUAN</span><div className="bb-topbar-actions"><NotificationDropdown /><button className="bb-cart-button" type="button" onClick={() => navigate('/customer/cart')}>Giỏ hàng <b>{getCartCount()}</b></button><CustomerAvatar /></div></header>
        <section className="bb-content">
          <p className="bb-eyebrow">Welcome back</p>
          <h1>Chào, {user.name}.</h1>
          <p className="bb-subtitle">Hôm nay bạn muốn thưởng thức gì từ Blossom Brew?</p>

          <div className="bb-home-actions">
            <button className="primary-button" type="button" onClick={() => navigate('/customer/menu')}>Đặt món ngay</button>
            <button className="outline-button" type="button" onClick={() => navigate('/customer/history')}>Xem đơn hàng</button>
          </div>

          <div className="bb-home-summary">
            <article><p>Điểm thành viên</p><strong>{points} điểm</strong><small>{nextTier > 0 ? `Còn ${nextTier} điểm để chạm Gold` : 'Bạn đang ở hạng Gold'}</small><button type="button" onClick={() => navigate('/customer/points')}>Xem ưu đãi</button></article>
            <article><p>Đơn hàng gần đây</p><strong>{orders.length} đơn</strong><small>{orders[0] ? `Đơn mới nhất: ${orders[0].id}` : 'Bạn chưa có đơn hàng nào'}</small><button type="button" onClick={() => navigate('/customer/history')}>Lịch sử đơn</button></article>
          </div>

          <section className="bb-home-orders">
            <div className="bb-section-heading"><div><p className="bb-eyebrow">Recent orders</p><h2>Đơn hàng gần đây.</h2></div><button className="bb-review-link" type="button" onClick={() => navigate('/customer/history')}>Xem tất cả</button></div>
            {orders.length ? orders.slice(0, 3).map((order) => <article className="bb-home-order" key={order.id}><div><strong>{order.id}</strong><small>{order.product || order.items?.map((item) => `${item.name} ×${item.quantity}`).join(', ')}</small></div><strong>{formatPrice(order.total)}</strong><span className={`bb-status ${getStatusGroup(order.status)} ${order.status === 'Đang pha' ? 'brewing' : ''}`}>{order.status || 'Chờ xác nhận'}</span></article>) : <p className="bb-history-empty">Chưa có đơn hàng nào. Hãy chọn món yêu thích của bạn.</p>}
          </section>
        </section>
      </main>
    </div>
  )
}

export default CustomerHome
