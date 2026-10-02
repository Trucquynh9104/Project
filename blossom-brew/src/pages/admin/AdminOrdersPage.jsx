import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  addMemberPoints,
  getCurrentUser,
  logoutUser,
} from '../../services/authService'

const statusFilters = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'Chờ xác nhận', label: 'Chờ xác nhận' },
  { value: 'Đang pha', label: 'Đang pha' },
  { value: 'Hoàn tất', label: 'Hoàn tất' },
  { value: 'Đã hủy', label: 'Đã hủy' },
]

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem('blossom-orders') || '[]')
  } catch {
    return []
  }
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString('vi-VN')}đ`
}

function formatDateTime(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function getStatusClass(status) {
  if (status === 'Hoàn tất') return 'completed'
  if (status === 'Đã hủy') return 'cancelled'
  if (status === 'Đang pha') return 'processing'
  return 'pending'
}

function getChannel(order) {
  return order.orderType === 'counter' ? 'Tại quầy' : 'Website'
}

function isToday(value) {
  if (!value) return false
  const date = new Date(value)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

function isLastSevenDays(value) {
  if (!value) return false
  const limit = new Date()
  limit.setDate(limit.getDate() - 7)
  return new Date(value).getTime() >= limit.getTime()
}

function AdminOrdersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const user = getCurrentUser()
  const [orders, setOrders] = useState(getOrders)
  const [keyword, setKeyword] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)

  const filteredOrders = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    return [...orders]
      .filter((order) => {
        const matchesKeyword = !normalizedKeyword || [order.id, order.receiver, order.member?.name, order.product]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword)
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter
        const matchesDate = dateFilter === 'all' || (dateFilter === 'today' ? isToday(order.createdAt) : isLastSevenDays(order.createdAt))
        return matchesKeyword && matchesStatus && matchesDate
      })
      .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0))
  }, [dateFilter, keyword, orders, statusFilter])

  useEffect(() => {
    const orderId = searchParams.get('order')
    if (!orderId) return
    setSelectedOrder(orders.find((order) => order.id === orderId) || null)
  }, [orders, searchParams])

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  const dateLabel = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date())

  const navItems = [
    { icon: '⌂', label: 'Tổng quan', to: '/admin' },
    { icon: '⌁', label: 'Quản lý menu', to: '/admin/products' },
    { icon: '□', label: 'Đơn hàng', to: '/admin/orders', active: true },
    { icon: '◦', label: 'Thành viên', to: '/admin/members' },
    { icon: '◇', label: 'Voucher', to: '/admin/vouchers' },
    { icon: '♙', label: 'Tài khoản thu ngân', to: '/admin/cashiers' },
    { icon: '↗', label: 'Báo cáo', to: '/admin/reports' },
    { icon: '✦', label: 'Thông báo', to: '/admin/notices' },
    { icon: '○', label: 'Thông tin cá nhân', to: '/admin/profile' },
  ]

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  function openOrderDetail(order) {
    setSelectedOrder(order)
    navigate(`/admin/orders?order=${encodeURIComponent(order.id)}`)
  }

  function closeOrderDetail() {
    setSelectedOrder(null)
    navigate('/admin/orders', { replace: true })
  }

  function updateStatus(orderId, status) {
    const orderToUpdate = orders.find((order) => order.id === orderId)
    if (!orderToUpdate) return

    const pointsToAdd = Math.floor(Number(orderToUpdate.total || 0) / 20000)
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
        memberType: orderToUpdate.member.memberType || 'account',
        points: pointsToAdd,
      })
      if (result.ok) awardedPoints = pointsToAdd
    }

    const updatedOrders = orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            status,
            group: status === 'Hoàn tất' ? 'completed' : status === 'Đã hủy' ? 'cancelled' : 'incomplete',
            pointsAwarded: order.pointsAwarded || awardedPoints > 0,
            earnedPoints: order.earnedPoints || awardedPoints,
          }
        : order,
    )

    localStorage.setItem('blossom-orders', JSON.stringify(updatedOrders))
    setOrders(updatedOrders)
  }

  function exportOrders() {
    const headers = ['Mã đơn', 'Khách hàng', 'Kênh bán', 'Thời gian', 'Tổng tiền', 'Trạng thái']
    const lines = filteredOrders.map((order) => [
      order.id,
      order.receiver || order.member?.name || 'Khách vãng lai',
      getChannel(order),
      formatDateTime(order.createdAt || order.time),
      order.total || 0,
      order.status || 'Chờ xác nhận',
    ])
    const csv = [headers, ...lines]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'blossom-brew-orders.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-dashboard admin-orders-page">
      <aside className="admin-sidebar">
        <button className="admin-brand" type="button" onClick={() => navigate('/admin')}><span>B</span>Blossom Brew</button>
        <p className="admin-sidebar-label">Admin workspace</p>
        <nav className="admin-nav">
          {navItems.map((item) => <button className={item.active ? 'admin-nav-item active' : 'admin-nav-item'} key={item.label} type="button" onClick={() => navigate(item.to)}><span>{item.icon}</span>{item.label}</button>)}
        </nav>
        <div className="admin-profile"><span className="admin-avatar">{initials}</span><div><strong>{user.name}</strong><small>Administrator</small></div><button type="button" onClick={handleLogout}>Đăng xuất</button></div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar"><span>ĐƠN HÀNG</span><span>{dateLabel}　✦</span></header>
        <section className="admin-content">
          <div className="admin-orders-heading">
            <div><p className="admin-eyebrow">Order management</p><h1>Đơn hàng.</h1><p>Theo dõi đơn online và tại quầy, can thiệp xử lý khi cần thiết.</p></div>
            <button className="admin-export-button" type="button" onClick={exportOrders}>Xuất dữ liệu</button>
          </div>

          <div className="admin-orders-toolbar">
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm theo mã đơn, khách hàng..." />
            <div>
              <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}><option value="today">Hôm nay</option><option value="7days">7 ngày gần đây</option><option value="all">Tất cả thời gian</option></select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{statusFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            </div>
          </div>

          <section className="admin-orders-table-figma">
            <div className="admin-orders-row-figma admin-orders-header-figma"><span>Mã đơn</span><span>Khách hàng</span><span>Kênh bán</span><span>Tổng tiền</span><span>Trạng thái</span><span>Thao tác</span></div>
            {filteredOrders.map((order) => (
              <div className="admin-orders-row-figma" key={order.id}>
                <strong>{order.id}</strong>
                <span className="admin-order-customer"><strong>{order.receiver || order.member?.name || 'Khách vãng lai'}</strong><small>{order.product || '—'} · {formatDateTime(order.createdAt || order.time)}</small></span>
                <span>{getChannel(order)}</span>
                <strong>{formatPrice(order.total)}</strong>
                <select className={`admin-order-status ${getStatusClass(order.status)}`} value={order.status || 'Chờ xác nhận'} onChange={(event) => updateStatus(order.id, event.target.value)}>
                  {statusFilters.slice(1).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <button className="admin-order-detail-figma" type="button" onClick={() => openOrderDetail(order)}>Chi tiết</button>
              </div>
            ))}
            {!filteredOrders.length && <p className="admin-empty">Chưa có đơn hàng phù hợp.</p>}
          </section>
        </section>
      </main>

      {selectedOrder && (
        <div className="admin-modal-overlay" onClick={closeOrderDetail}>
          <section className="admin-order-modal" onClick={(event) => event.stopPropagation()}>
            <button className="admin-modal-close" type="button" onClick={closeOrderDetail}>×</button>
            <p className="admin-eyebrow">{selectedOrder.id}</p><h2>Chi tiết đơn hàng</h2>
            <div className="admin-order-detail-meta"><p><b>Khách hàng:</b> {selectedOrder.receiver || selectedOrder.member?.name || 'Khách vãng lai'}</p><p><b>Kênh bán:</b> {getChannel(selectedOrder)}</p><p><b>Thời gian:</b> {formatDateTime(selectedOrder.createdAt || selectedOrder.time)}</p><p><b>Thanh toán:</b> {selectedOrder.paymentMethod === 'cash' ? 'Tiền mặt' : selectedOrder.paymentMethod === 'card' ? 'Thẻ' : 'QR'}</p></div>
            <div className="admin-modal-items">
              {(selectedOrder.items || []).map((item) => <div key={item.id}><div><strong>{item.name} ×{item.quantity}</strong><small>Size {item.size || 'M'} · {item.sugar || '50%'} · {item.ice || 'Đá tiêu chuẩn'}{item.toppings?.length ? ` · ${item.toppings.join(', ')}` : ''}{item.note ? ` · Ghi chú: ${item.note}` : ''}</small></div><b>{formatPrice(Number(item.price || 0) * Number(item.quantity || 0))}</b></div>)}
            </div>
            <div className="admin-order-financial"><span>Tạm tính</span><b>{formatPrice(selectedOrder.subtotal || selectedOrder.total)}</b><span>Giảm giá</span><b>-{formatPrice(selectedOrder.discount)}</b></div>
            <div className="admin-modal-total"><span>Tổng thanh toán</span><strong>{formatPrice(selectedOrder.total)}</strong></div>
          </section>
        </div>
      )}
    </div>
  )
}

export default AdminOrdersPage
