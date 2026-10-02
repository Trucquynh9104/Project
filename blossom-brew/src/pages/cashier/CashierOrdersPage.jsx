import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  addMemberPoints,
  getCurrentUser,
  logoutUser,
} from '../../services/authService'

const statusFilters = [
  'Tất cả trạng thái',
  'Chờ xác nhận',
  'Đang pha',
  'Hoàn tất',
  'Đã hủy',
]

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString('vi-VN')}đ`
}

function getOrderGroup(status) {
  if (status === 'Hoàn tất') return 'completed'
  if (status === 'Đã hủy') return 'cancelled'
  if (status === 'Chờ xác nhận') return 'incomplete'

  return 'processing'
}

function CustomerName({ order }) {
  return (
    <div>
      <strong>
        {order.member?.name || order.receiver || 'Khách vãng lai'}
      </strong>
      <small>{order.product}</small>
    </div>
  )
}

function CashierOrdersPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()

  const [filter, setFilter] = useState('Tất cả trạng thái')
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [orders, setOrders] = useState(() =>
    JSON.parse(localStorage.getItem('blossom-orders') || '[]'),
  )

  const filteredOrders = useMemo(() => {
    if (filter === 'Tất cả trạng thái') return orders

    return orders.filter((order) => order.status === filter)
  }, [orders, filter])

  if (!user || user.role !== 'cashier') {
    return <Navigate to="/login" replace />
  }

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

  function updateOrderStatus(id, status) {
    const orderToUpdate = orders.find((order) => order.id === id)

    if (!orderToUpdate) return

    const pointsToAdd = Math.floor(
      Number(orderToUpdate.total || 0) / 20000,
    )

    const shouldAwardPoints =
      status === 'Hoàn tất' &&
      orderToUpdate.status !== 'Hoàn tất' &&
      !orderToUpdate.pointsAwarded &&
      orderToUpdate.member &&
      pointsToAdd > 0

    let awardedPoints = 0

    if (shouldAwardPoints) {
      const result = addMemberPoints({
        id: orderToUpdate.member.id,
        memberType: orderToUpdate.member.memberType,
        points: pointsToAdd,
      })

      if (result.ok) {
        awardedPoints = pointsToAdd
      }
    }

    const updatedOrders = orders.map((order) =>
      order.id === id
        ? {
            ...order,
            status,
            group: getOrderGroup(status),
            pointsAwarded: order.pointsAwarded || awardedPoints > 0,
            earnedPoints: order.earnedPoints || awardedPoints,
          }
        : order,
    )

    setOrders(updatedOrders)

    localStorage.setItem(
      'blossom-orders',
      JSON.stringify(updatedOrders),
    )
  }

  return (
    <div className="cashier-dashboard">
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

        <nav className="cashier-nav">
          <button
            className="cashier-nav-item"
            type="button"
            onClick={() => navigate('/cashier')}
          >
            <span>▥</span>
            Tạo đơn tại quầy
          </button>

          <button className="cashier-nav-item active" type="button">
            <span>□</span>
            Quản lý đơn hàng
          </button>

          <button
            className="cashier-nav-item"
            type="button"
            onClick={() => navigate('/cashier/shift')}
          >
            <span>◌</span>
            Ca làm việc
          </button>

          <button
            className="cashier-nav-item"
            type="button"
            onClick={() => navigate('/cashier/notices')}
          >
            <span>✦</span>
            Thông báo
          </button>

          <button
            className="cashier-nav-item"
            type="button"
            onClick={() => navigate('/cashier/profile')}
          >
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

          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="cashier-main">
        <section className="cashier-content">
          <div className="cashier-heading">
            <div>
              <p className="cashier-eyebrow">Store orders</p>
              <h1>Quản lý đơn hàng.</h1>
              <p>
                Theo dõi và cập nhật trạng thái đơn được xử lý tại quầy.
              </p>
            </div>

            <button
              className="cashier-outline-button"
              type="button"
              onClick={() => navigate('/cashier')}
            >
              ＋ Tạo đơn mới
            </button>
          </div>

          <div className="cashier-order-toolbar">
            <p>{filteredOrders.length} đơn hàng</p>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              {statusFilters.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>

          <section className="cashier-orders-table">
            <div className="cashier-orders-row cashier-orders-header">
              <span>Mã đơn</span>
              <span>Khách hàng / sản phẩm</span>
              <span>Thời gian</span>
              <span>Trạng thái</span>
              <span>Thao tác</span>
            </div>

            {filteredOrders.map((order) => (
              <div key={order.id} className="cashier-order-record">
                <div className="cashier-orders-row">
                  <strong>{order.id}</strong>

                  <CustomerName order={order} />

                  <span>{order.time || '—'}</span>

                  <select
                    className={`cashier-status-select ${getOrderGroup(
                      order.status,
                    )}`}
                    value={order.status}
                    onChange={(event) =>
                      updateOrderStatus(order.id, event.target.value)
                    }
                  >
                    <option value="Chờ xác nhận">Chờ xác nhận</option>
                    <option value="Đang pha">Đang pha</option>
                    <option value="Hoàn tất">Hoàn tất</option>
                    <option value="Đã hủy">Đã hủy</option>
                  </select>

                  <button
                    className="cashier-detail-button"
                    type="button"
                    onClick={() =>
                      setExpandedOrderId(
                        expandedOrderId === order.id ? null : order.id,
                      )
                    }
                  >
                    {expandedOrderId === order.id ? 'Đóng' : 'Chi tiết'}
                  </button>
                </div>

                {expandedOrderId === order.id && (
                  <div className="cashier-order-detail">
                    <div>
                      <span>Khách nhận</span>
                      <strong>
                        {order.receiver || 'Khách vãng lai'}
                      </strong>
                    </div>

                    <div>
                      <span>Thanh toán</span>
                      <strong>
                        {order.paymentMethod === 'cash'
                          ? 'Tiền mặt'
                          : order.paymentMethod === 'qr'
                            ? 'QR'
                            : 'Thẻ'}
                      </strong>
                    </div>

                    <div>
                      <span>Tổng thanh toán</span>
                      <strong>{formatPrice(order.total)}</strong>
                    </div>

                    {order.earnedPoints > 0 && (
                      <div>
                        <span>Điểm tích lũy</span>
                        <strong>+{order.earnedPoints} điểm</strong>
                      </div>
                    )}

                    <div className="cashier-order-detail-items">
                      {order.items?.map((item) => (
                        <p key={item.id}>
                          <strong>
                            {item.name} ×{item.quantity}
                          </strong>

                          <span>
                            Size {item.size} · {item.sugar} đường ·{' '}
                            {item.ice}
                            {item.toppings?.length > 0 &&
                              ` · ${item.toppings.join(', ')}`}
                            {item.note && ` · Ghi chú: ${item.note}`}
                          </span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredOrders.length === 0 && (
              <p className="cashier-orders-empty">
                Chưa có đơn hàng phù hợp.
              </p>
            )}
          </section>
        </section>
      </main>
    </div>
  )
}

export default CashierOrdersPage