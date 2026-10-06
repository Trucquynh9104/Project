import { notifyOrderCreated } from './notificationService'

const ORDERS_KEY = 'blossom-orders'

function getOrderGroup(status) {
  if (status === 'Hoàn tất') return 'completed'
  if (status === 'Đã hủy') return 'cancelled'
  if (status === 'Chờ xác nhận') return 'incomplete'
  return 'processing'
}

const NEXT_ORDER_STATUSES = {
  'Chờ xác nhận': ['Đang pha', 'Đã hủy'],
  'Đang pha': ['Hoàn tất', 'Đã hủy'],
  'Hoàn tất': [],
  'Đã hủy': [],
}

export function getNextOrderStatuses(status) {
  return NEXT_ORDER_STATUSES[status || 'Chờ xác nhận'] || []
}

// Một nguồn lưu duy nhất cho trạng thái đơn hàng.
// Chỉ lần đầu chuyển sang Hoàn tất mới đóng dấu hoàn tất để báo cáo không bị ghi nhận trùng.
export function saveOrderStatus({ orderId, status, actor, cancellationReason = '' }) {
  const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]')
  const currentOrder = orders.find((order) => order.id === orderId)

  if (!currentOrder) return { ok: false, message: 'Không tìm thấy đơn hàng.', order: null, orders }

  const allowedStatuses = getNextOrderStatuses(currentOrder.status)
  if (!allowedStatuses.includes(status)) {
    return { ok: false, message: 'Đơn ở trạng thái cuối hoặc không thể chuyển sang trạng thái này.', order: currentOrder, orders }
  }

  if (status === 'Đã hủy' && !cancellationReason.trim()) {
    return { ok: false, message: 'Vui lòng nhập lý do hủy đơn.', order: currentOrder, orders }
  }

  const isCompleting = status === 'Hoàn tất' && currentOrder.status !== 'Hoàn tất'
  const now = new Date().toISOString()
  const updatedOrder = {
    ...currentOrder,
    status,
    group: getOrderGroup(status),
    statusUpdatedAt: now,
    completedAt: isCompleting ? now : currentOrder.completedAt,
    completedBy: isCompleting && actor?.id ? actor.id : currentOrder.completedBy,
    cancelledAt: status === 'Đã hủy' ? now : currentOrder.cancelledAt,
    cancelledBy: status === 'Đã hủy' && actor?.id ? actor.id : currentOrder.cancelledBy,
    cancellationReason: status === 'Đã hủy' ? cancellationReason.trim() : currentOrder.cancellationReason,
    cashierId:
      isCompleting && actor?.role === 'cashier'
        ? currentOrder.cashierId || actor.id
        : currentOrder.cashierId,
    cashierName:
      isCompleting && actor?.role === 'cashier'
        ? currentOrder.cashierName || actor.name
        : currentOrder.cashierName,
  }
  const updatedOrders = orders.map((order) =>
    order.id === orderId ? updatedOrder : order,
  )

  localStorage.setItem(ORDERS_KEY, JSON.stringify(updatedOrders))
  window.dispatchEvent(new Event('blossom-orders-updated'))

  return { ok: true, order: updatedOrder, previousOrder: currentOrder, orders: updatedOrders }
}

export function createCustomerOrder({
  user,
  cart,
  total,
  paymentMethod = 'Thanh toán online',
}) {
  if (!user) {
    return {
      ok: false,
      message: 'Bạn cần đăng nhập để đặt hàng.',
    }
  }

  if (!cart.length) {
    return {
      ok: false,
      message: 'Giỏ hàng đang trống.',
    }
  }

  const now = new Date()

  const order = {
    id: `#BB-${Date.now().toString().slice(-6)}`,
    createdAt: now.toISOString(),
    time: now.toLocaleString('vi-VN'),
    product: cart
      .map((item) => `${item.name} ×${item.quantity}`)
      .join(', '),
    items: cart,
    total,
    subtotal: total,
    discount: 0,
    voucherCode: '',
    orderType: 'online',
    paymentMethod,
    receiver: user.name,
    member: {
      id: user.id,
      name: user.name,
      phone: user.phone || '',
      points: user.points || 0,
      memberType: 'account',
    },
    status: 'Chờ xác nhận',
    group: 'incomplete',
  }

  const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]')

  localStorage.setItem(
    ORDERS_KEY,
    JSON.stringify([order, ...orders]),
  )
  window.dispatchEvent(new Event('blossom-orders-updated'))

  notifyOrderCreated(order)

  return {
    ok: true,
    order,
    message: 'Đặt hàng thành công.',
  }
}
