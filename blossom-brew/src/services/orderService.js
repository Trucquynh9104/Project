const ORDERS_KEY = 'blossom-orders'

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

  return {
    ok: true,
    order,
    message: 'Đặt hàng thành công.',
  }
}