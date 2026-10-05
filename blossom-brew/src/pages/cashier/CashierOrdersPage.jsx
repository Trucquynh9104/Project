import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import CashierShell from '../../components/CashierShell'
import DateRangeFilter from '../../components/DateRangeFilter'
import { addMemberPoints, getCurrentUser } from '../../services/authService'
import { notifyOrderStatusChanged, notifyPointsAwarded } from '../../services/notificationService'
import { isInDateRange } from '../../utils/dateRange'

const statusFilters = [
  'Tất cả trạng thái',
  'Chờ xác nhận',
  'Đang pha',
  'Hoàn tất',
  'Đã hủy',
]

const ITEMS_PER_PAGE = 8

function ListFooter({ currentPage, onPageChange, totalItems, totalPages }) {
  return (
    <div className="cashier-list-footer">
      <span>Tổng số đơn hàng <b>{totalItems}</b></span>
      <div>
        <button
          aria-label="Trang trước"
          disabled={currentPage === 1}
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          ‹
        </button>
        <span>Trang {currentPage}/{totalPages}</span>
        <button
          aria-label="Trang sau"
          disabled={currentPage === totalPages}
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          ›
        </button>
      </div>
    </div>
  )
}

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
      <strong>{order.member?.name || order.receiver || 'Khách vãng lai'}</strong>
      <small>{order.product}</small>
    </div>
  )
}

function CashierOrdersPage() {
  const user = getCurrentUser()
  const [filter, setFilter] = useState('Tất cả trạng thái')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [orders, setOrders] = useState(() =>
    JSON.parse(localStorage.getItem('blossom-orders') || '[]'),
  )

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = filter === 'Tất cả trạng thái' || order.status === filter
      return matchesStatus && isInDateRange(order.createdAt, fromDate, toDate)
    })
  }, [orders, filter, fromDate, toDate])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE))
  const activePage = Math.min(currentPage, totalPages)
  const paginatedOrders = filteredOrders.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE,
  )

  if (!user || user.role !== 'cashier') {
    return <Navigate to="/login" replace />
  }

  function updateOrderStatus(id, status) {
    const orderToUpdate = orders.find((order) => order.id === id)
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

    const updatedOrder = {
      ...orderToUpdate,
      status,
      group: getOrderGroup(status),
      pointsAwarded: orderToUpdate.pointsAwarded || awardedPoints > 0,
      earnedPoints: orderToUpdate.earnedPoints || awardedPoints,
    }
    const updatedOrders = orders.map((order) => order.id === id ? updatedOrder : order)

    setOrders(updatedOrders)
    localStorage.setItem('blossom-orders', JSON.stringify(updatedOrders))
    notifyOrderStatusChanged({
      actorRole: 'cashier',
      order: updatedOrder,
      previousStatus: orderToUpdate.status,
      status,
    })

    if (awardedPoints > 0) {
      notifyPointsAwarded({
        actorRole: 'cashier',
        member: updatedOrder.member,
        orderId: updatedOrder.id,
        points: awardedPoints,
      })
    }
  }

  function exportOrders() {
    const rows = filteredOrders.map((order) => [
      order.id,
      order.member?.name || order.receiver || 'Khách vãng lai',
      order.product || '',
      order.time || '',
      order.status || '',
      Number(order.total || 0),
    ])
    const csv = [
      ['Mã đơn', 'Khách hàng', 'Sản phẩm', 'Thời gian', 'Trạng thái', 'Tổng tiền'],
      ...rows,
    ]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'don-hang-tai-quay.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <CashierShell
      active="orders"
      topbarDescription="Theo dõi và cập nhật trạng thái đơn được xử lý tại cửa hàng."
      topbarTitle="Quản lý đơn hàng."
      user={user}
    >
      <section className="cashier-content cashier-list-content">
        <div className="cashier-order-toolbar">
          <DateRangeFilter
            className="cashier-order-date"
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={(value) => {
              setFromDate(value)
              setCurrentPage(1)
            }}
            onToDateChange={(value) => {
              setToDate(value)
              setCurrentPage(1)
            }}
          />
          <div>
            <button className="cashier-outline-button" type="button" onClick={exportOrders}>
              Xuất file
            </button>
            <select
              aria-label="Lọc trạng thái đơn hàng"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value)
                setCurrentPage(1)
              }}
            >
              {statusFilters.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
        </div>

        <section className="cashier-orders-table">
          <div className="cashier-orders-row cashier-orders-header">
            <span>Mã đơn</span>
            <span>Khách hàng / sản phẩm</span>
            <span>Thời gian</span>
            <span>Trạng thái</span>
            <span>Thao tác</span>
          </div>

          {paginatedOrders.map((order) => (
            <div key={order.id} className="cashier-order-record">
              <div className="cashier-orders-row">
                <strong>{order.id}</strong>
                <CustomerName order={order} />
                <span>{order.time || '—'}</span>
                <select
                  className={`cashier-status-select ${getOrderGroup(order.status)}`}
                  value={order.status}
                  onChange={(event) => updateOrderStatus(order.id, event.target.value)}
                >
                  {statusFilters.slice(1).map((status) => <option key={status}>{status}</option>)}
                </select>
                <button
                  className="cashier-detail-button"
                  type="button"
                  onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                >
                  {expandedOrderId === order.id ? 'Đóng' : 'Chi tiết'}
                </button>
              </div>

              {expandedOrderId === order.id && (
                <div className="cashier-order-detail">
                  <div><span>Khách nhận</span><strong>{order.receiver || 'Khách vãng lai'}</strong></div>
                  <div><span>Thanh toán</span><strong>{order.paymentMethod === 'cash' ? 'Tiền mặt' : order.paymentMethod === 'qr' ? 'QR' : 'Thẻ'}</strong></div>
                  <div><span>Tổng thanh toán</span><strong>{formatPrice(order.total)}</strong></div>
                  {order.earnedPoints > 0 && <div><span>Điểm tích lũy</span><strong>+{order.earnedPoints} điểm</strong></div>}
                  <div className="cashier-order-detail-items">
                    {order.items?.map((item) => (
                      <p key={item.id}>
                        <strong>{item.name} ×{item.quantity}</strong>
                        <span>Size {item.size} · {item.sugar} đường · {item.ice}{item.toppings?.length > 0 && ` · ${item.toppings.join(', ')}`}{item.note && ` · Ghi chú: ${item.note}`}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {!filteredOrders.length && <p className="cashier-orders-empty">Chưa có đơn hàng phù hợp.</p>}

          <ListFooter
            currentPage={activePage}
            totalItems={filteredOrders.length}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </section>
      </section>
    </CashierShell>
  )
}

export default CashierOrdersPage
