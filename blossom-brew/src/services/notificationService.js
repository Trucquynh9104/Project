const NOTIFICATIONS_KEY = 'blossom-brew-notifications'
const NOTIFICATIONS_SEEDED_KEY = 'blossom-brew-notifications-seeded'
const NOTIFICATIONS_UPDATED_EVENT = 'blossom-notifications-updated'

let sequence = 0

const starterNotifications = [
  {
    id: 'starter-customer-welcome',
    eventKey: 'starter-customer-welcome',
    recipientRole: 'customer',
    title: 'Chào mừng bạn đến Blossom Brew',
    content: 'Khám phá menu và những ưu đãi dành riêng cho thành viên.',
    to: '/customer/menu',
    time: 'Hôm nay',
    createdAt: '2026-09-20T09:00:00.000Z',
  },
  {
    id: 'starter-customer-voucher',
    eventKey: 'starter-customer-voucher',
    recipientRole: 'customer',
    title: 'Ưu đãi thành viên sẵn sàng',
    content: 'Theo dõi điểm và đổi voucher trực tiếp trên trang Điểm & voucher.',
    to: '/customer/points',
    time: 'Hôm nay',
    createdAt: '2026-09-15T09:00:00.000Z',
  },
  {
    id: 'starter-cashier-stock',
    eventKey: 'starter-cashier-stock',
    recipientRole: 'cashier',
    title: 'Cold Brew Cam còn 12 phần',
    content: 'Quản lý nhắc theo dõi số lượng món bán trong ca sáng và báo lại khi sắp hết nguyên liệu.',
    to: '/cashier/orders',
    time: '09:00',
    createdAt: '2026-09-20T09:00:00.000Z',
  },
  {
    id: 'starter-cashier-voucher',
    eventKey: 'starter-cashier-voucher',
    recipientRole: 'cashier',
    title: 'Cập nhật voucher BBSILVER',
    content: 'Voucher giảm 20% chỉ áp dụng với hoá đơn từ 80.000đ và còn hạn đến 30/09.',
    to: '/cashier/orders',
    time: '09:00',
    createdAt: '2026-09-15T09:00:00.000Z',
  },
  {
    id: 'starter-cashier-shift',
    eventKey: 'starter-cashier-shift',
    recipientRole: 'cashier',
    title: 'Nhắc kiểm đếm tiền đầu ca',
    content: 'Vui lòng hoàn tất xác nhận tiền mặt đầu ca trước khi thực hiện giao dịch đầu tiên.',
    to: '/cashier/shift',
    time: '09:00',
    createdAt: '2026-09-09T09:00:00.000Z',
  },
  {
    id: 'starter-admin-stock',
    eventKey: 'starter-admin-stock',
    recipientRole: 'admin',
    title: 'Cold Brew Cam sắp hết hàng',
    content: 'Món còn 12 phần, cần kiểm tra nguyên liệu và kế hoạch bổ sung.',
    to: '/admin/products',
    time: 'Hôm nay',
    createdAt: '2026-09-20T09:00:00.000Z',
  },
  {
    id: 'starter-admin-shift',
    eventKey: 'starter-admin-shift',
    recipientRole: 'admin',
    title: 'Ca sáng đang hoạt động',
    content: 'Thu ngân đã mở ca và đang xử lý các đơn tại quầy.',
    to: '/admin/cashiers',
    time: 'Hôm nay',
    createdAt: '2026-09-20T08:00:00.000Z',
  },
]

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function getStoredNotifications() {
  if (!canUseStorage()) return []

  try {
    const saved = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function publishNotifications(notifications) {
  if (!canUseStorage()) return

  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications))
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT))
}

function ensureStarterNotifications() {
  if (!canUseStorage() || localStorage.getItem(NOTIFICATIONS_SEEDED_KEY)) return

  const existing = getStoredNotifications()
  const existingKeys = new Set(existing.map((item) => item.eventKey))
  const merged = [
    ...starterNotifications
      .filter((item) => !existingKeys.has(item.eventKey))
      .map((item) => ({ ...item, readBy: [] })),
    ...existing,
  ]

  localStorage.setItem(NOTIFICATIONS_SEEDED_KEY, 'true')
  publishNotifications(merged)
}

function hasAccountMember(member) {
  return Boolean(member?.id && member.memberType !== 'loyalty')
}

function orderName(order) {
  return order?.id || 'đơn hàng'
}

function orderStatusText(status) {
  if (status === 'Chờ xác nhận') return 'đang chờ cửa hàng xác nhận'
  if (status === 'Đang pha') return 'đang được pha'
  if (status === 'Hoàn tất') return 'đã hoàn tất'
  if (status === 'Đã hủy') return 'đã được hủy'
  return `đã chuyển sang trạng thái ${status}`
}

export function createNotification({
  content,
  eventKey,
  recipientRole,
  recipientUserId = '',
  title,
  to,
  type = 'system',
}) {
  if (!recipientRole || !title || !canUseStorage()) return null

  ensureStarterNotifications()
  const notifications = getStoredNotifications()

  if (eventKey) {
    const duplicate = notifications.find((item) => item.eventKey === eventKey)
    if (duplicate) return duplicate
  }

  sequence += 1
  const notification = {
    id: `notice-${Date.now()}-${sequence}`,
    eventKey: eventKey || `notice-${Date.now()}-${sequence}`,
    recipientRole,
    recipientUserId,
    title,
    content: content || '',
    to: to || '',
    type,
    createdAt: new Date().toISOString(),
    readBy: [],
  }

  publishNotifications([notification, ...notifications])
  return notification
}

export function initializeNotifications() {
  ensureStarterNotifications()
}

export function getNotificationsForUser(user) {
  if (!user?.id || !user?.role) return []

  return getStoredNotifications()
    .filter((notification) =>
      notification.recipientRole === user.role &&
      (!notification.recipientUserId || notification.recipientUserId === user.id),
    )
    .map((notification) => ({
      ...notification,
      read: Array.isArray(notification.readBy) && notification.readBy.includes(user.id),
    }))
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
}

export function markNotificationRead(user, notificationId) {
  if (!user?.id || !notificationId) return

  const updated = getStoredNotifications().map((notification) => {
    if (notification.id !== notificationId) return notification
    const readBy = Array.isArray(notification.readBy) ? notification.readBy : []
    return readBy.includes(user.id) ? notification : { ...notification, readBy: [...readBy, user.id] }
  })

  publishNotifications(updated)
}

export function markAllNotificationsRead(user) {
  if (!user?.id || !user?.role) return []

  const updated = getStoredNotifications().map((notification) => {
    const isRecipient =
      notification.recipientRole === user.role &&
      (!notification.recipientUserId || notification.recipientUserId === user.id)

    if (!isRecipient) return notification
    const readBy = Array.isArray(notification.readBy) ? notification.readBy : []
    return readBy.includes(user.id) ? notification : { ...notification, readBy: [...readBy, user.id] }
  })

  publishNotifications(updated)
  // Trả lại đúng danh sách của tài khoản đang đăng nhập để UI đổi ngay,
  // không phụ thuộc vào việc component khác có bắt được custom event hay không.
  return updated
    .filter((notification) =>
      notification.recipientRole === user.role &&
      (!notification.recipientUserId || notification.recipientUserId === user.id),
    )
    .map((notification) => ({ ...notification, read: true }))
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
}

export function subscribeNotifications(callback) {
  if (typeof window === 'undefined') return () => {}

  const handleChange = () => callback()
  window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleChange)
  window.addEventListener('storage', handleChange)

  return () => {
    window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleChange)
    window.removeEventListener('storage', handleChange)
  }
}

export function getNotificationTime(notification) {
  if (notification?.time) return notification.time
  if (!notification?.createdAt) return 'Vừa xong'

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(notification.createdAt))
}

export function getNotificationDate(notification) {
  if (!notification?.createdAt) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(notification.createdAt))
}

export function getNotificationLabel(notification) {
  if (notification?.time) return notification.time
  if (!notification?.createdAt) return 'Vừa xong'

  const createdAt = new Date(notification.createdAt)
  const now = new Date()
  const isToday =
    createdAt.getFullYear() === now.getFullYear() &&
    createdAt.getMonth() === now.getMonth() &&
    createdAt.getDate() === now.getDate()

  return isToday ? getNotificationTime(notification) : getNotificationDate(notification)
}

export function notifyOrderCreated(order) {
  const orderId = orderName(order)
  const isCounterOrder = order?.orderType === 'counter'

  if (hasAccountMember(order?.member)) {
    createNotification({
      recipientRole: 'customer',
      recipientUserId: order.member.id,
      eventKey: `order-created-customer-${orderId}`,
      title: `Đơn ${orderId} đã được tiếp nhận`,
      content: 'Cửa hàng sẽ xác nhận và cập nhật trạng thái đơn của bạn sớm nhất.',
      to: '/customer/history',
      type: 'order',
    })
  }

  createNotification({
    recipientRole: 'cashier',
    eventKey: `order-created-cashier-${orderId}`,
    title: isCounterOrder ? `Đơn tại quầy ${orderId} đã được tạo` : `Có đơn online mới ${orderId}`,
    content: isCounterOrder
      ? 'Đơn đã chuyển sang trạng thái đang pha.'
      : 'Vui lòng kiểm tra và xử lý đơn hàng mới.',
    to: '/cashier/orders',
    type: 'order',
  })

  createNotification({
    recipientRole: 'admin',
    eventKey: `order-created-admin-${orderId}`,
    title: `Có đơn hàng mới ${orderId}`,
    content: `${isCounterOrder ? 'Đơn tại quầy' : 'Đơn online'} đã được tạo và cần theo dõi.`,
    to: `/admin/orders?order=${encodeURIComponent(orderId)}`,
    type: 'order',
  })
}

export function notifyOrderStatusChanged({ actorRole, order, previousStatus, status }) {
  if (!order || !status || previousStatus === status) return

  const orderId = orderName(order)

  if (hasAccountMember(order.member)) {
    createNotification({
      recipientRole: 'customer',
      recipientUserId: order.member.id,
      eventKey: `order-status-customer-${orderId}-${status}`,
      title: `Đơn ${orderId} ${orderStatusText(status)}`,
      content: status === 'Hoàn tất'
        ? 'Cảm ơn bạn đã sử dụng dịch vụ của Blossom Brew.'
        : 'Bạn có thể theo dõi chi tiết đơn hàng trong Lịch sử đơn hàng.',
      to: '/customer/history',
      type: 'order',
    })
  }

  if (actorRole !== 'cashier') {
    createNotification({
      recipientRole: 'cashier',
      eventKey: `order-status-cashier-${orderId}-${status}`,
      title: `Đơn ${orderId} đã chuyển sang ${status}`,
      content: 'Trạng thái đơn hàng vừa được quản trị viên cập nhật.',
      to: '/cashier/orders',
      type: 'order',
    })
  }

  if (actorRole !== 'admin') {
    createNotification({
      recipientRole: 'admin',
      eventKey: `order-status-admin-${orderId}-${status}`,
      title: `Đơn ${orderId} đã chuyển sang ${status}`,
      content: 'Thu ngân vừa cập nhật trạng thái xử lý đơn hàng.',
      to: `/admin/orders?order=${encodeURIComponent(orderId)}`,
      type: 'order',
    })
  }
}

export function notifyPointsAwarded({ actorRole, member, orderId, points }) {
  if (!member || Number(points) <= 0) return

  if (hasAccountMember(member)) {
    createNotification({
      recipientRole: 'customer',
      recipientUserId: member.id,
      eventKey: `points-awarded-customer-${orderId}`,
      title: `Bạn vừa nhận ${points} điểm`,
      content: `Điểm tích luỹ từ đơn ${orderId} đã được cộng vào tài khoản.`,
      to: '/customer/points',
      type: 'points',
    })
  }

  if (actorRole !== 'admin') {
    createNotification({
      recipientRole: 'admin',
      eventKey: `points-awarded-admin-${orderId}`,
      title: `Đã cộng ${points} điểm cho thành viên`,
      content: `Điểm được cộng sau khi đơn ${orderId} hoàn tất.`,
      to: '/admin/members',
      type: 'points',
    })
  }
}

export function notifyMemberPointsAdjusted({ member, points }) {
  if (!hasAccountMember(member)) return

  createNotification({
    recipientRole: 'customer',
    recipientUserId: member.id,
    eventKey: `points-adjusted-${member.id}-${Date.now()}`,
    title: 'Điểm thành viên đã được cập nhật',
    content: `Số điểm hiện tại của bạn là ${Number(points || 0).toLocaleString('vi-VN')} điểm.`,
    to: '/customer/points',
    type: 'points',
  })
}

export function notifyVoucherChanged({ action, voucher }) {
  if (!voucher?.code) return

  const active = Boolean(voucher.active) && action !== 'deactivated' && action !== 'deleted'
  const customerTitle = active
    ? `Voucher ${voucher.code} đã được cập nhật`
    : `Voucher ${voucher.code} đã ngừng áp dụng`
  const customerContent = active
    ? `Kiểm tra điều kiện sử dụng voucher ${voucher.code} tại trang Điểm & voucher.`
    : `Voucher ${voucher.code} hiện không còn khả dụng cho đơn hàng mới.`

  ;['customer', 'cashier', 'admin'].forEach((recipientRole) => {
    createNotification({
      recipientRole,
      eventKey: `voucher-${action}-${recipientRole}-${voucher.id || voucher.code}`,
      title: recipientRole === 'customer' ? customerTitle : `Voucher ${voucher.code} đã được cập nhật`,
      content: recipientRole === 'customer'
        ? customerContent
        : `Voucher ${voucher.code} ${active ? 'đã thay đổi điều kiện hoặc trạng thái áp dụng.' : 'đã được ngừng áp dụng.'}`,
      to: recipientRole === 'customer' ? '/customer/points' : recipientRole === 'cashier' ? '/cashier/orders' : '/admin/vouchers',
      type: 'voucher',
    })
  })
}

export function notifyVoucherUsed({ order, voucherCode }) {
  if (!voucherCode) return

  const orderId = orderName(order)

  if (hasAccountMember(order?.member)) {
    createNotification({
      recipientRole: 'customer',
      recipientUserId: order.member.id,
      eventKey: `voucher-used-customer-${orderId}-${voucherCode}`,
      title: `Voucher ${voucherCode} đã được áp dụng`,
      content: `Ưu đãi đã được ghi nhận cho đơn ${orderId}.`,
      to: '/customer/history',
      type: 'voucher',
    })
  }

  createNotification({
    recipientRole: 'admin',
    eventKey: `voucher-used-admin-${orderId}-${voucherCode}`,
    title: `Voucher ${voucherCode} vừa được sử dụng`,
    content: `Đơn ${orderId} đã áp dụng ưu đãi này.`,
    to: '/admin/orders',
    type: 'voucher',
  })
}

export function notifyPointsRedeemed({ user, voucher }) {
  if (!user?.id || !voucher?.code) return

  createNotification({
    recipientRole: 'customer',
    recipientUserId: user.id,
    eventKey: `points-redeemed-customer-${voucher.id}`,
    title: `Đổi điểm nhận voucher ${voucher.code} thành công`,
    content: 'Voucher đã được thêm vào tài khoản của bạn.',
    to: '/customer/points',
    type: 'voucher',
  })

  createNotification({
    recipientRole: 'admin',
    eventKey: `points-redeemed-admin-${voucher.id}`,
    title: 'Khách hàng vừa đổi điểm lấy voucher',
    content: `Voucher ${voucher.code} được tạo từ chương trình tích điểm.`,
    to: '/admin/members',
    type: 'voucher',
  })
}

export function notifyShiftCloseRequested({ shift }) {
  if (!shift?.id) return

  createNotification({
    recipientRole: 'admin',
    eventKey: `shift-close-request-${shift.id}`,
    title: `${shift.cashierName || 'Thu ngân'} gửi yêu cầu đóng ca`,
    content: `Ca ${shift.name || 'làm việc'} đã được kiểm đếm và chờ quản trị viên theo dõi.`,
    to: '/admin/cashiers',
    type: 'shift',
  })
}
