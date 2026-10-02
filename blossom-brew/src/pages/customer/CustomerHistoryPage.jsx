import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../../services/authService'
import NotificationDropdown from '../../components/NotificationDropdown'
import CustomerAvatar from '../../components/CustomerAvatar'

const navigationItems = [
  { icon: '⌂', label: 'Tổng quan', to: '/customer' },
  { icon: '⌁', label: 'Menu & đặt món', to: '/customer/menu' },
  { icon: '□', label: 'Giỏ hàng', to: '/customer/cart' },
  { icon: '◇', label: 'Điểm & voucher', to: '/customer/points' },
  { icon: '◷', label: 'Lịch sử đơn hàng', to: '/customer/history', active: true },
  { icon: '✦', label: 'Thông báo', to: '/customer/notices' },
  { icon: '☷', label: 'Thông tin cá nhân', to: '/customer/profile' },
]

const statusFilters = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'Chờ xác nhận', label: 'Chờ xác nhận' },
  { value: 'Đang pha', label: 'Đang pha' },
  { value: 'Hoàn tất', label: 'Hoàn tất' },
  { value: 'Đã hủy', label: 'Đã hủy' },
]

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

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString('vi-VN')}đ`
}

function formatOrderTime(order) {
  if (order.createdAt) {
    const date = new Date(order.createdAt)

    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    }
  }

  return order.time || '—'
}

function getOrderGroup(order) {
  if (order.status === 'Hoàn tất') return 'completed'
  if (order.status === 'Đã hủy') return 'cancelled'
  return 'incomplete'
}

function getOrderProduct(order) {
  return (order.items || [])
    .map((item) => `${item.name} ×${item.quantity}`)
    .join(', ')
}

function getOrderOptions(order) {
  return (order.items || [])
    .map((item) => {
      const toppings = item.toppings?.length
        ? item.toppings.join(', ')
        : 'Không topping'

      return `Size ${item.size || 'M'} · ${item.sugar || 'Không đường'} · ${item.ice || 'Không đá'} · ${toppings}`
    })
    .join(' | ')
}

function CustomerHistoryPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [filter, setFilter] = useState('all')

  const orders = useMemo(() => {
    if (!user) return []

    try {
      const allOrders = JSON.parse(
        localStorage.getItem('blossom-orders') || '[]',
      )

      return allOrders
        .filter(
          (order) =>
            order.member?.id === user.id ||
            (!order.member?.id && order.receiver === user.name),
        )
        .sort(
          (first, second) =>
            new Date(second.createdAt || 0) - new Date(first.createdAt || 0),
        )
    } catch {
      return []
    }
  }, [user])

  const reviewedOrderIds = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('blossom-reviews') || '[]').map(
        (review) => review.orderId,
      )
    } catch {
      return []
    }
  }, [])

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders
    return orders.filter((order) => (order.status || 'Chờ xác nhận') === filter)
  }, [filter, orders])

  if (!user) return <Navigate to="/login" replace />

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()

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
            <small>Silver member</small>
          </div>
          <button type="button" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </aside>

      <main className="bb-main">
        <header className="bb-topbar">
          <span>LỊCH SỬ ĐƠN</span>
          <div className="bb-topbar-actions">
            <NotificationDropdown />
            <button className="bb-cart-button" type="button" onClick={() => navigate('/customer/cart')}>
              Giỏ hàng <b>{getCartCount()}</b>
            </button>
            <CustomerAvatar />
          </div>
        </header>

        <section className="bb-content">
          <p className="bb-eyebrow">Past orders</p>
          <div className="bb-page-heading">
            <div>
              <h1>Đơn hàng của bạn.</h1>
              <p className="bb-subtitle">Xem lại các đơn đã đặt và trạng thái xử lý đơn hàng.</p>
            </div>

            <select className="bb-order-filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
              {statusFilters.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div className="bb-order-table">
            <div className="bb-order-row bb-order-header">
              <span>Mã đơn</span>
              <span>Sản phẩm</span>
              <span>Ngày đặt</span>
              <span>Tổng tiền</span>
              <span>Trạng thái</span>
            </div>

            {filteredOrders.map((order) => {
              const orderGroup = getOrderGroup(order)
              const canReview = order.status === 'Hoàn tất' && !reviewedOrderIds.includes(order.id)
              const productName = getOrderProduct(order) || order.product || 'Đơn hàng'

              return (
                <div className="bb-order-row" key={order.id}>
                  <strong>{order.id}</strong>
                  <div className="bb-product-cell">
                    <span>{productName}</span>
                    <small>{getOrderOptions(order) || order.options || ''}</small>
                  </div>
                  <span>{formatOrderTime(order)}</span>
                  <strong>{formatPrice(order.total)}</strong>

                  <div className="bb-status-cell">
                    <span className={`bb-status ${orderGroup} ${order.status === 'Đang pha' ? 'brewing' : ''}`}>
                      {order.status || 'Chờ xác nhận'}
                    </span>

                    {order.earnedPoints > 0 && <small className="bb-earned-points">+{order.earnedPoints} điểm</small>}

                    {canReview && (
                      <button
                        className="bb-review-link"
                        type="button"
                        onClick={() =>
                          navigate(
                            `/customer/review?orderId=${encodeURIComponent(order.id)}&product=${encodeURIComponent(productName)}`,
                          )
                        }
                      >
                        Đánh giá
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filteredOrders.length === 0 && <p className="bb-history-empty">Chưa có đơn hàng thuộc trạng thái này.</p>}
        </section>
      </main>
    </div>
  )
}

export default CustomerHistoryPage
