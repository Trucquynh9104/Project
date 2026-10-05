import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import CashierShell from '../../components/CashierShell'
import DateRangeFilter from '../../components/DateRangeFilter'
import { getCurrentUser } from '../../services/authService'
import { notifyShiftCloseRequested } from '../../services/notificationService'
import { isInDateRange } from '../../utils/dateRange'

const ORDERS_KEY = 'blossom-orders'
const SHIFT_HISTORY_KEY = 'blossom-cashier-shift-history'

function getShiftKey(cashierId) {
  return `blossom-cashier-current-shift-${cashierId}`
}

function readStorageList(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function getOrders() {
  return readStorageList(ORDERS_KEY)
}

function getShiftHistory(cashierId) {
  return readStorageList(SHIFT_HISTORY_KEY)
    .filter((item) => item.cashierId === cashierId)
    .sort((first, second) => new Date(second.openedAt || 0) - new Date(first.openedAt || 0))
}

function createShift(user) {
  return {
    id: `shift-${Date.now()}`,
    cashierId: user.id,
    cashierName: user.name,
    name: 'Ca sáng',
    status: 'pending',
    startedManually: false,
    openedAt: null,
    closedAt: null,
    openingCash: 0,
    actualCash: null,
  }
}

function loadShift(user) {
  const shiftKey = getShiftKey(user.id)

  try {
    const savedShift = JSON.parse(localStorage.getItem(shiftKey) || 'null')
    if (
      savedShift?.cashierId === user.id &&
      (savedShift.status === 'pending' || (savedShift.status === 'open' && savedShift.startedManually))
    ) {
      return savedShift
    }
  } catch {
    // Dữ liệu bị lỗi thì tạo một ca nháp mới.
  }

  const newShift = createShift(user)
  localStorage.setItem(shiftKey, JSON.stringify(newShift))
  return newShift
}

function getMoneyValue(value) {
  const digits = String(value || '').replace(/\D/g, '')
  return digits ? Number(digits) : Number.NaN
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

function isPaidOrder(order) {
  return Boolean(
    order.paymentStatus === 'paid' ||
    order.paidAt ||
    (order.orderType === 'counter' && order.paymentMethod && order.status !== 'Đã hủy') ||
    order.status === 'Hoàn tất',
  )
}

function CashierShiftPage() {
  const user = getCurrentUser()
  const [shift, setShift] = useState(() => (user ? loadShift(user) : null))
  const [orders, setOrders] = useState(getOrders)
  const [history, setHistory] = useState(() => (user ? getShiftHistory(user.id) : []))
  const [openingCash, setOpeningCash] = useState(() =>
    shift?.openingCash ? String(shift.openingCash) : '',
  )
  const [actualCash, setActualCash] = useState('')
  const [message, setMessage] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    function refreshShiftData() {
      setOrders(getOrders())
      if (user?.id) setHistory(getShiftHistory(user.id))
    }

    window.addEventListener('focus', refreshShiftData)
    window.addEventListener('storage', refreshShiftData)
    return () => {
      window.removeEventListener('focus', refreshShiftData)
      window.removeEventListener('storage', refreshShiftData)
    }
  }, [user?.id])

  const shiftOrders = useMemo(() => {
    if (!shift?.openedAt || !user) return []

    const openedAt = new Date(shift.openedAt).getTime()
    const closedAt = shift.closedAt ? new Date(shift.closedAt).getTime() : Number.POSITIVE_INFINITY

    return orders.filter((order) => {
      const createdAt = new Date(order.createdAt).getTime()
      const belongsToCurrentCashier = order.cashierId
        ? order.cashierId === user.id
        : order.orderType === 'counter'

      return (
        belongsToCurrentCashier &&
        createdAt >= openedAt &&
        createdAt <= closedAt &&
        isInDateRange(order.createdAt, fromDate, toDate)
      )
    })
  }, [orders, shift, user, fromDate, toDate])

  const paidOrders = useMemo(
    () => shiftOrders.filter(isPaidOrder),
    [shiftOrders],
  )
  const pendingOrders = useMemo(
    () => shiftOrders.filter((order) => !['Hoàn tất', 'Đã hủy'].includes(order.status)).length,
    [shiftOrders],
  )
  const revenue = useMemo(
    () => paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [paidOrders],
  )
  const filteredHistory = useMemo(
    () => history.filter((item) => isInDateRange(item.openedAt, fromDate, toDate)),
    [history, fromDate, toDate],
  )

  if (!user || user.role !== 'cashier' || !shift) {
    return <Navigate to="/login" replace />
  }

  function saveShift(updatedShift) {
    localStorage.setItem(getShiftKey(user.id), JSON.stringify(updatedShift))
    setShift(updatedShift)
  }

  function upsertShiftHistory(updatedShift) {
    const updatedHistory = [
      updatedShift,
      ...readStorageList(SHIFT_HISTORY_KEY).filter((item) => item.id !== updatedShift.id),
    ]
    localStorage.setItem(SHIFT_HISTORY_KEY, JSON.stringify(updatedHistory))
    setHistory(getShiftHistory(user.id))
  }

  function startShift() {
    const amount = getMoneyValue(openingCash)
    if (!Number.isFinite(amount) || amount < 0) {
      setMessage('Vui lòng nhập tiền mặt đầu ca hợp lệ.')
      return
    }

    const startedShift = {
      ...shift,
      openingCash: amount,
      openedAt: new Date().toISOString(),
      status: 'open',
      startedManually: true,
    }
    saveShift(startedShift)
    upsertShiftHistory(startedShift)
    setOpeningCash(String(amount))
    setMessage('Đã bắt đầu ca và ghi nhận tiền mặt đầu ca.')
  }

  function handleShiftAction() {
    if (shift.status === 'pending') {
      setMessage('Vui lòng nhập tiền mặt đầu ca và bấm Bắt đầu ca trước.')
      return
    }

    if (shift.status === 'open') {
      const amount = getMoneyValue(actualCash)
      if (!Number.isFinite(amount) || amount < 0) {
        setMessage('Vui lòng nhập số tiền kiểm đếm trước khi đóng ca.')
        return
      }
      if (!window.confirm('Bạn có muốn kết thúc ca hiện tại không?')) return

      const closedShift = {
        ...shift,
        actualCash: amount,
        status: 'closed',
        closedAt: new Date().toISOString(),
      }
      saveShift(closedShift)
      upsertShiftHistory(closedShift)
      notifyShiftCloseRequested({ shift: closedShift })
      setMessage('Đã kết thúc ca và lưu lịch sử ca làm việc.')
      return
    }

    const newShift = createShift(user)
    saveShift(newShift)
    setOpeningCash('')
    setActualCash('')
    setOrders(getOrders())
    setMessage('Sẵn sàng mở ca mới. Vui lòng nhập tiền mặt đầu ca.')
  }

  const isShiftOpen = shift.status === 'open'
  const isShiftPending = shift.status === 'pending'

  return (
    <CashierShell
      active="shift"
      topbarDescription="Theo dõi các đơn hàng và tiền mặt trong ca hiện tại."
      topbarTitle="Ca làm việc."
      user={user}
    >
      <section className="cashier-content cashier-shift-content">
        <DateRangeFilter
          className="cashier-shift-date"
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
        />

        <section className="cashier-shift-summary">
          <article><strong>{String(shiftOrders.length).padStart(2, '0')}</strong><span>Đơn đã tạo trong ca</span></article>
          <article><strong>{formatPrice(revenue)}</strong><span>Doanh thu đã thanh toán</span></article>
          <article><strong>{String(pendingOrders).padStart(2, '0')}</strong><span>Đơn đang xử lý</span></article>
        </section>

        <section className="cashier-shift-controls">
          <article>
            <h2>Mở ca</h2>
            <label>
              Tiền mặt đầu ca
              <input
                disabled={!isShiftPending}
                inputMode="numeric"
                placeholder="Nhập tiền đầu ca"
                value={openingCash}
                onChange={(event) => setOpeningCash(event.target.value)}
              />
            </label>
            <button className="cashier-outline-button" disabled={!isShiftPending} type="button" onClick={startShift}>
              {isShiftPending ? 'Bắt đầu ca' : 'Ca đang mở'}
            </button>
          </article>

          <article>
            <h2>Đóng ca</h2>
            <label>
              Tiền mặt thực tế
              <input
                disabled={!isShiftOpen}
                inputMode="numeric"
                placeholder="Nhập số tiền kiểm đếm"
                value={actualCash}
                onChange={(event) => setActualCash(event.target.value)}
              />
            </label>
            <button className="cashier-shift-action" disabled={isShiftPending} type="button" onClick={handleShiftAction}>
              {isShiftOpen ? 'Kết thúc ca' : isShiftPending ? 'Chưa mở ca' : 'Mở ca mới'}
            </button>
          </article>
        </section>

        {message && <p className="cashier-message">{message}</p>}

        <section className="cashier-shift-history">
          <div className="cashier-shift-history-heading">
            <div>
              <p>Lưu vết giao ca</p>
              <h2>Lịch sử ca làm việc</h2>
            </div>
            <span>{filteredHistory.length} ca</span>
          </div>

          {filteredHistory.length ? (
            <div className="cashier-shift-history-table">
              <div className="cashier-shift-history-row cashier-shift-history-labels">
                <span>Mở ca lúc</span><span>Tiền đầu ca</span><span>Đóng ca lúc</span><span>Tiền thực tế</span><span>Trạng thái</span>
              </div>
              {filteredHistory.map((item) => (
                <div className="cashier-shift-history-row" key={item.id}>
                  <span>{formatDateTime(item.openedAt)}</span>
                  <b>{formatPrice(item.openingCash)}</b>
                  <span>{formatDateTime(item.closedAt)}</span>
                  <b>{item.closedAt ? formatPrice(item.actualCash) : '—'}</b>
                  <i className={item.status === 'closed' ? 'closed' : 'open'}>{item.status === 'closed' ? 'Đã đóng' : 'Đang mở'}</i>
                </div>
              ))}
            </div>
          ) : (
            <p className="cashier-shift-history-empty">Chưa có lịch sử ca làm việc.</p>
          )}
        </section>
      </section>
    </CashierShell>
  )
}

export default CashierShiftPage
