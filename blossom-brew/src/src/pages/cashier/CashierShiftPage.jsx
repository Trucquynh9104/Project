import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import CashierShell from '../../components/CashierShell'
import { getCurrentUser } from '../../services/authService'
import { notifyShiftCloseRequested } from '../../services/notificationService'

const ORDERS_KEY = 'blossom-orders'
const SHIFT_HISTORY_KEY = 'blossom-cashier-shift-history'

function getShiftKey(cashierId) {
  return `blossom-cashier-current-shift-${cashierId}`
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString('vi-VN')}đ`
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
    openingCash: 500000,
  }
}

function loadShift(user) {
  const shiftKey = getShiftKey(user.id)
  try {
    const savedShift = JSON.parse(localStorage.getItem(shiftKey) || 'null')
    if (savedShift?.cashierId === user.id) return savedShift
  } catch {
    // Tạo lại ca nếu dữ liệu cũ bị lỗi.
  }

  const newShift = createShift(user)
  localStorage.setItem(shiftKey, JSON.stringify(newShift))
  return newShift
}

function CashierShiftPage() {
  const user = getCurrentUser()
  const [shift, setShift] = useState(() => (user ? loadShift(user) : null))
  const [orders, setOrders] = useState(getOrders)
  const [openingCash, setOpeningCash] = useState(() => String(shift?.openingCash || 500000))
  const [actualCash, setActualCash] = useState('')
  const [message, setMessage] = useState('')

  const shiftOrders = useMemo(() => {
    if (!shift || !user) return []
    const openedAt = new Date(shift.openedAt).getTime()
    const closedAt = shift.closedAt ? new Date(shift.closedAt).getTime() : Number.POSITIVE_INFINITY

    return orders.filter((order) => {
      const createdAt = new Date(order.createdAt).getTime()
      return (!order.cashierId || order.cashierId === user.id) && createdAt >= openedAt && createdAt <= closedAt
    })
  }, [orders, shift, user])

  const completedOrders = useMemo(
    () => shiftOrders.filter((order) => order.status === 'Hoàn tất'),
    [shiftOrders],
  )
  const pendingOrders = useMemo(
    () => shiftOrders.filter((order) => !['Hoàn tất', 'Đã hủy'].includes(order.status)).length,
    [shiftOrders],
  )
  const revenue = useMemo(
    () => completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [completedOrders],
  )

  if (!user || user.role !== 'cashier') {
    return <Navigate to="/login" replace />
  }

  function saveShift(updatedShift) {
    localStorage.setItem(getShiftKey(user.id), JSON.stringify(updatedShift))
    setShift(updatedShift)
  }

  function saveOpeningCash() {
    const amount = Number(openingCash.replace(/\D/g, ''))
    if (!amount) {
      setMessage('Vui lòng nhập tiền mặt đầu ca hợp lệ.')
      return
    }
    saveShift({ ...shift, openingCash: amount })
    setOpeningCash(String(amount))
    setMessage('Đã lưu tiền mặt đầu ca.')
  }

  function handleShiftAction() {
    if (shift.status === 'open') {
      if (!actualCash.trim()) {
        setMessage('Vui lòng nhập số tiền kiểm đếm trước khi đóng ca.')
        return
      }
      if (!window.confirm('Bạn có muốn kết thúc ca hiện tại không?')) return

      const closedShift = {
        ...shift,
        actualCash: Number(actualCash.replace(/\D/g, '')) || 0,
        status: 'closed',
        closedAt: new Date().toISOString(),
      }
      saveShift(closedShift)

      let history = []
      try {
        history = JSON.parse(localStorage.getItem(SHIFT_HISTORY_KEY) || '[]')
      } catch {
        history = []
      }
      localStorage.setItem(
        SHIFT_HISTORY_KEY,
        JSON.stringify([...history.filter((item) => item.id !== closedShift.id), closedShift]),
      )
      notifyShiftCloseRequested({ shift: closedShift })
      setMessage('Đã kết thúc ca và lưu báo cáo ca làm việc.')
      return
    }

    const newShift = createShift(user)
    saveShift(newShift)
    setOpeningCash(String(newShift.openingCash))
    setActualCash('')
    setOrders(getOrders())
    setMessage('Đã mở ca mới.')
  }

  return (
    <CashierShell
      active="shift"
      topbarDescription="Theo dõi tổng quan các giao dịch tại quầy trong ca hiện tại."
      topbarTitle="Ca làm việc."
      user={user}
    >
      <section className="cashier-content cashier-shift-content">
        <p className="cashier-shift-date">01/09/2026 <span>–</span> 30/09/2026 <b>✦</b></p>

        <section className="cashier-shift-summary">
          <article><strong>{String(shiftOrders.length).padStart(2, '0')}</strong><span>Đơn đã tạo trong ca</span></article>
          <article><strong>{formatPrice(revenue)}</strong><span>Doanh thu tạm tính</span></article>
          <article><strong>{String(pendingOrders).padStart(2, '0')}</strong><span>Đơn đang xử lý</span></article>
        </section>

        <section className="cashier-shift-controls">
          <article>
            <h2>Mở ca</h2>
            <label>
              Tiền mặt đầu ca
              <input
                inputMode="numeric"
                value={openingCash}
                disabled={shift.status === 'closed'}
                onChange={(event) => setOpeningCash(event.target.value)}
              />
            </label>
            <button className="cashier-outline-button" disabled={shift.status === 'closed'} type="button" onClick={saveOpeningCash}>
              Lưu thông tin
            </button>
          </article>

          <article>
            <h2>Đóng ca</h2>
            <label>
              Tiền mặt thực tế
              <input
                inputMode="numeric"
                value={actualCash}
                disabled={shift.status === 'closed'}
                placeholder="Nhập số tiền kiểm đếm"
                onChange={(event) => setActualCash(event.target.value)}
              />
            </label>
            <button className="cashier-shift-action" type="button" onClick={handleShiftAction}>
              {shift.status === 'open' ? 'Gửi yêu cầu đóng ca' : 'Mở ca mới'}
            </button>
          </article>
        </section>

        {message && <p className="cashier-message">{message}</p>}
      </section>
    </CashierShell>
  )
}

export default CashierShiftPage
