import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import CashierShell from '../../components/CashierShell'
import { getCurrentUser } from '../../services/authService'

const ORDERS_KEY = 'blossom-orders'
const ITEMS_PER_PAGE = 8

const defaultNotices = [
  {
    id: 'stock-cold-brew',
    title: 'Cold Brew Cam còn 12 phần',
    content: 'Quản lý nhắc theo dõi số lượng món bán trong ca sáng và báo lại khi sắp hết nguyên liệu.',
    time: '09:00',
    createdAt: '2026-09-20T09:00:00.000Z',
    target: 'orders',
    read: false,
  },
  {
    id: 'voucher-bbsilver',
    title: 'Cập nhật voucher BBSILVER',
    content: 'Voucher giảm 20% chỉ áp dụng với hoá đơn từ 80.000đ và còn hạn đến 30/09.',
    time: '09:00',
    createdAt: '2026-09-15T09:00:00.000Z',
    target: 'orders',
    read: false,
  },
  {
    id: 'cash-count',
    title: 'Nhắc kiểm đếm tiền đầu ca',
    content: 'Vui lòng hoàn tất xác nhận tiền mặt đầu ca trước khi thực hiện giao dịch đầu tiên.',
    time: '09:00',
    createdAt: '2026-09-09T09:00:00.000Z',
    target: 'shift',
    read: false,
  },
]

function ListFooter({ currentPage, onPageChange, totalItems, totalPages }) {
  return (
    <div className="cashier-list-footer">
      <span>Tổng số thông báo <b>{totalItems}</b></span>
      <div>
        <button aria-label="Trang trước" disabled={currentPage === 1} type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))}>‹</button>
        <span>Trang {currentPage}/{totalPages}</span>
        <button aria-label="Trang sau" disabled={currentPage === totalPages} type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}>›</button>
      </div>
    </div>
  )
}

function getNoticesKey(cashierId) {
  return `blossom-cashier-notices-${cashierId}`
}

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]')
  } catch {
    return []
  }
}

function formatTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
}

function getDefaultNotices(user) {
  const orders = getOrders().filter((order) => !order.cashierId || order.cashierId === user.id).slice(0, 5)

  if (!orders.length) return defaultNotices

  const orderNotices = orders.map((order) => ({
    id: `order-${order.id}`,
    title: order.status === 'Hoàn tất' ? `Đơn ${order.id} đã hoàn tất` : `Đơn ${order.id} cần xử lý`,
    content: order.status === 'Hoàn tất' ? `Đơn ${order.product || ''} đã được hoàn tất.` : `Đơn ${order.product || ''} hiện ở trạng thái ${order.status || 'Đang pha'}.`,
    time: formatTime(order.createdAt),
    createdAt: order.createdAt,
    target: 'orders',
    read: false,
  }))

  return orderNotices
}

function loadNotices(user) {
  let savedNotices = []
  try {
    savedNotices = JSON.parse(localStorage.getItem(getNoticesKey(user.id)) || '[]')
  } catch {
    savedNotices = []
  }

  const savedById = new Map(savedNotices.map((notice) => [notice.id, notice]))
  const notices = getDefaultNotices(user).map((notice) => ({
    ...notice,
    read: savedById.get(notice.id)?.read ?? notice.read,
  }))
  localStorage.setItem(getNoticesKey(user.id), JSON.stringify(notices))
  return notices
}

function CashierNoticesPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [notices, setNotices] = useState(() => (user ? loadNotices(user) : []))
  const [currentPage, setCurrentPage] = useState(1)
  const unreadCount = useMemo(() => notices.filter((notice) => !notice.read).length, [notices])
  const totalPages = Math.max(1, Math.ceil(notices.length / ITEMS_PER_PAGE))
  const activePage = Math.min(currentPage, totalPages)
  const paginatedNotices = notices.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE)

  if (!user || user.role !== 'cashier') {
    return <Navigate to="/login" replace />
  }

  function saveNotices(updatedNotices) {
    setNotices(updatedNotices)
    localStorage.setItem(getNoticesKey(user.id), JSON.stringify(updatedNotices))
  }

  function openNotice(notice) {
    saveNotices(notices.map((item) => item.id === notice.id ? { ...item, read: true } : item))
    navigate(notice.target === 'shift' ? '/cashier/shift' : '/cashier/orders')
  }

  function markAllAsRead() {
    saveNotices(notices.map((notice) => ({ ...notice, read: true })))
  }

  return (
    <CashierShell active="notices" topbarTitle="Thông báo" user={user}>
      <section className="cashier-content cashier-list-content cashier-notices-content">
        <div className="cashier-notices-toolbar">
          <button
            className="cashier-outline-button"
            disabled={!unreadCount}
            type="button"
            onClick={markAllAsRead}
          >
            Đánh dấu tất cả đã đọc
          </button>
          <p>01/09/2026 <span>–</span> 30/09/2026 <b>✦</b></p>
        </div>

        <section className="cashier-notice-list">
          {paginatedNotices.map((notice, index) => (
            <button
              className={notice.read ? 'cashier-notice-item' : 'cashier-notice-item unread'}
              key={notice.id}
              type="button"
              onClick={() => openNotice(notice)}
            >
              <span className="cashier-notice-number">{String((activePage - 1) * ITEMS_PER_PAGE + index + 1).padStart(2, '0')}</span>
              <span className="cashier-notice-copy"><strong>{notice.title}</strong><small>{notice.content}</small></span>
              <span className="cashier-notice-time"><b>{notice.time}</b><small>{formatDate(notice.createdAt)}</small></span>
            </button>
          ))}
          {!notices.length && <p className="cashier-orders-empty">Chưa có thông báo nào.</p>}
          <ListFooter currentPage={activePage} totalItems={notices.length} totalPages={totalPages} onPageChange={setCurrentPage} />
        </section>
      </section>
    </CashierShell>
  )
}

export default CashierNoticesPage
