import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  getCurrentUser,
  getMembershipLabel,
  getPersonalVouchers,
  logoutUser,
  SILVER_MIN_POINTS,
  consumePersonalVoucher,
} from '../../services/authService'
import NotificationDropdown from '../../components/NotificationDropdown'
import CustomerAvatar from '../../components/CustomerAvatar'

const navigationItems = [
  { icon: '⌂', label: 'Tổng quan', to: '/customer' },
  { icon: '⌁', label: 'Menu & đặt món', to: '/customer/menu' },
  { icon: '□', label: 'Giỏ hàng', to: '/customer/cart' },
  { icon: '◇', label: 'Điểm & voucher', to: '/customer/points' },
  { icon: '◷', label: 'Lịch sử đơn hàng', to: '/customer/history' },
  { icon: '✦', label: 'Thông báo', to: '/customer/notices' },
  { icon: '☷', label: 'Thông tin cá nhân', to: '/customer/profile' },
]

function getCart() {
  try {
    return JSON.parse(localStorage.getItem('blossom-cart') || '[]')
  } catch {
    return []
  }
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString('vi-VN')}đ`
}

function getAdminVouchers() {
  const defaults = [
    {
      code: 'BBSILVER',
      type: 'percent',
      value: 20,
      minOrder: 80000,
      maxDiscount: 30000,
      active: true,
      requiresSilver: true,
    },
    {
      code: 'WELCOME25',
      type: 'fixed',
      value: 25000,
      minOrder: 60000,
      maxDiscount: 0,
      active: true,
    },
  ]

  try {
    const saved = localStorage.getItem('blossom-vouchers')
    return saved ? JSON.parse(saved) : defaults
  } catch {
    return defaults
  }
}

function isExpired(expiry) {
  return Boolean(expiry && new Date(`${expiry}T23:59:59`) < new Date())
}

function getVoucherResult({ voucherCode, user, subtotal }) {
  if (!voucherCode) {
    return { discount: 0, message: '', isValid: false, isPersonalVoucher: false }
  }

  const personalVoucher = getPersonalVouchers(user.id).find(
    (voucher) => voucher.code === voucherCode,
  )

  if (personalVoucher) {
    const minOrder = Number(personalVoucher.minOrder || 0)

    if (subtotal < minOrder) {
      return {
        discount: 0,
        message: `Voucher áp dụng cho đơn từ ${formatPrice(minOrder)}.`,
        isValid: false,
        isPersonalVoucher: true,
      }
    }

    return {
      discount: Math.min(Number(personalVoucher.discount || 0), subtotal),
      message: `Đã áp dụng voucher ${personalVoucher.code}.`,
      isValid: true,
      isPersonalVoucher: true,
    }
  }

  const voucher = getAdminVouchers().find((item) => item.code === voucherCode)

  if (!voucher) {
    return {
      discount: 0,
      message: 'Voucher không hợp lệ hoặc đã được sử dụng.',
      isValid: false,
      isPersonalVoucher: false,
    }
  }

  if (!voucher.active) {
    return { discount: 0, message: 'Voucher này hiện đã được tắt.', isValid: false, isPersonalVoucher: false }
  }

  if (isExpired(voucher.expiry)) {
    return { discount: 0, message: 'Voucher này đã hết hạn.', isValid: false, isPersonalVoucher: false }
  }

  const minOrder = Number(voucher.minOrder || 0)

  if (subtotal < minOrder) {
    return {
      discount: 0,
      message: `Voucher áp dụng cho đơn từ ${formatPrice(minOrder)}.`,
      isValid: false,
      isPersonalVoucher: false,
    }
  }

  if (voucher.requiresSilver && Number(user.points || 0) < SILVER_MIN_POINTS) {
    return {
      discount: 0,
      message: `Voucher ${voucher.code} chỉ dành cho thành viên Silver từ ${SILVER_MIN_POINTS} điểm.`,
      isValid: false,
      isPersonalVoucher: false,
    }
  }

  const rawDiscount =
    voucher.type === 'percent'
      ? Math.round((subtotal * Number(voucher.value || 0)) / 100)
      : Number(voucher.value || 0)

  const maxDiscount = Number(voucher.maxDiscount || 0)
  const discount =
    voucher.type === 'percent' && maxDiscount > 0
      ? Math.min(rawDiscount, maxDiscount, subtotal)
      : Math.min(rawDiscount, subtotal)

  return {
    discount,
    message: `Đã áp dụng voucher ${voucher.code}.`,
    isValid: true,
    isPersonalVoucher: false,
  }
}

function CustomerCheckoutPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [cart, setCart] = useState(getCart)
  const [orderType, setOrderType] = useState('pickup')
  const [paymentMethod, setPaymentMethod] = useState('qr')
  const [showErrors, setShowErrors] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState('')
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: '',
    note: '',
  })

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [cart],
  )

  const voucherCode = localStorage.getItem('blossom-selected-voucher') || ''
  const voucherResult = useMemo(() => {
    if (!user) return { discount: 0, message: '', isValid: false, isPersonalVoucher: false }
    return getVoucherResult({ voucherCode, user, subtotal })
  }, [subtotal, user, voucherCode])

  const discount = voucherResult.discount
  const total = Math.max(subtotal - discount, 0)
  const cartCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0)

  if (!user) return <Navigate to="/login" replace />

  const membershipLabel = getMembershipLabel(user.points)

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  const errors = {}
  const normalizedPhone = form.phone.replace(/[\s.-]/g, '')

  if (!form.name.trim()) errors.name = 'Vui lòng nhập họ và tên.'
  if (!/^(0\d{9}|\+84\d{9})$/.test(normalizedPhone)) {
    errors.phone = 'Số điện thoại chưa đúng định dạng.'
  }
  if (orderType === 'delivery' && !form.address.trim()) {
    errors.address = 'Vui lòng nhập địa chỉ giao hàng.'
  }

  const isFormValid = Object.keys(errors).length === 0 && cart.length > 0

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  function handleSubmit(event) {
    event.preventDefault()
    setShowErrors(true)

    if (!isFormValid) return

    const now = new Date()
    const order = {
      id: `#BB-${String(Date.now()).slice(-6)}`,
      createdAt: now.toISOString(),
      time: new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }).format(now),
      product: cart.map((item) => `${item.name} ×${item.quantity}`).join(', '),
      items: cart,
      subtotal,
      discount,
      total,
      voucherCode: voucherResult.isValid ? voucherCode : '',
      orderType,
      paymentMethod,
      receiver: form.name.trim(),
      deliveryInfo: {
        name: form.name.trim(),
        phone: normalizedPhone,
        address: orderType === 'delivery' ? form.address.trim() : '',
        note: form.note.trim(),
      },
      member: {
        id: user.id,
        name: user.name,
        phone: user.phone || normalizedPhone,
        points: Number(user.points || 0),
        memberType: 'account',
      },
      status: 'Chờ xác nhận',
      group: 'incomplete',
      pointsAwarded: false,
      earnedPoints: 0,
    }

    const orders = JSON.parse(localStorage.getItem('blossom-orders') || '[]')
    localStorage.setItem('blossom-orders', JSON.stringify([order, ...orders]))

    if (voucherResult.isPersonalVoucher && voucherResult.isValid) {
      consumePersonalVoucher({ userId: user.id, code: voucherCode })
    }

    localStorage.removeItem('blossom-cart')
    localStorage.removeItem('blossom-selected-voucher')
    setCart([])
    setCreatedOrderId(order.id)
    setSubmitted(true)
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
            <button className="bb-nav-item" key={item.label} type="button" onClick={() => navigate(item.to)}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="bb-sidebar-profile">
          <span className="bb-avatar">{initials}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{membershipLabel}</small>
          </div>
          <button type="button" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </aside>

      <main className="bb-main">
        <header className="bb-topbar">
          <span>THANH TOÁN</span>
          <div className="bb-topbar-actions">
            <NotificationDropdown />
            <button className="bb-cart-button" type="button" onClick={() => navigate('/customer/cart')}>
              Giỏ hàng <b>{cartCount}</b>
            </button>
            <CustomerAvatar />
          </div>
        </header>

        <section className="bb-content bb-checkout-page">
          {submitted ? (
            <section className="bb-checkout-success">
              <p className="bb-eyebrow">Order created</p>
              <h1>Đặt hàng thành công.</h1>
              <p>Mã đơn của bạn là <strong>{createdOrderId}</strong>.</p>
              <p>Đơn đang chờ xác nhận. Bạn có thể theo dõi tại Lịch sử đơn hàng.</p>
              <div className="bb-checkout-success-actions">
                <button className="primary-button" type="button" onClick={() => navigate('/customer/history')}>
                  Xem lịch sử đơn
                </button>
                <button className="outline-button" type="button" onClick={() => navigate('/customer/menu')}>
                  Tiếp tục đặt món
                </button>
              </div>
            </section>
          ) : cart.length === 0 ? (
            <section className="bb-empty-cart">
              <h1>Giỏ hàng đang trống.</h1>
              <p>Hãy chọn món trước khi thanh toán.</p>
              <button className="primary-button" type="button" onClick={() => navigate('/customer/menu')}>
                Chọn món ngay
              </button>
            </section>
          ) : (
            <>
              <p className="bb-eyebrow">Checkout</p>
              <h1>Hoàn tất đơn hàng.</h1>
              <p className="bb-subtitle">Kiểm tra thông tin nhận hàng và chọn phương thức thanh toán.</p>

              <div className="bb-checkout-layout">
                <form className="bb-checkout-form" noValidate onSubmit={handleSubmit}>
                  <section className="bb-checkout-section">
                    <h2>Hình thức nhận hàng</h2>
                    <div className="bb-order-type-row">
                      <button className={orderType === 'pickup' ? 'active' : ''} type="button" onClick={() => setOrderType('pickup')}>Nhận tại quán</button>
                      <button className={orderType === 'delivery' ? 'active' : ''} type="button" onClick={() => setOrderType('delivery')}>Giao tận nơi</button>
                    </div>
                  </section>

                  <section className="bb-checkout-section">
                    <h2>Thông tin người nhận</h2>
                    <label>
                      HỌ VÀ TÊN <span className="required-mark">*</span>
                      <input name="name" value={form.name} onChange={handleChange} className={showErrors && errors.name ? 'input-error' : ''} placeholder="Nhập họ và tên" />
                      {showErrors && errors.name && <small className="field-error">{errors.name}</small>}
                    </label>
                    <label>
                      SỐ ĐIỆN THOẠI <span className="required-mark">*</span>
                      <input name="phone" value={form.phone} onChange={handleChange} className={showErrors && errors.phone ? 'input-error' : ''} placeholder="0912 345 678" />
                      {showErrors && errors.phone && <small className="field-error">{errors.phone}</small>}
                    </label>
                    {orderType === 'delivery' && (
                      <label>
                        ĐỊA CHỈ GIAO HÀNG <span className="required-mark">*</span>
                        <input name="address" value={form.address} onChange={handleChange} className={showErrors && errors.address ? 'input-error' : ''} placeholder="Số nhà, đường, phường/xã..." />
                        {showErrors && errors.address && <small className="field-error">{errors.address}</small>}
                      </label>
                    )}
                    <label>
                      GHI CHÚ
                      <textarea name="note" value={form.note} onChange={handleChange} placeholder="Ví dụ: Gọi điện trước khi giao hàng..." />
                    </label>
                  </section>

                  <section className="bb-checkout-section">
                    <h2>Phương thức thanh toán</h2>
                    <div className="bb-payment-row">
                      <button className={paymentMethod === 'qr' ? 'active' : ''} type="button" onClick={() => setPaymentMethod('qr')}>QR</button>
                      <button className={paymentMethod === 'cash' ? 'active' : ''} type="button" onClick={() => setPaymentMethod('cash')}>Tiền mặt</button>
                      <button className={paymentMethod === 'card' ? 'active' : ''} type="button" onClick={() => setPaymentMethod('card')}>Thẻ</button>
                    </div>
                  </section>

                  <button className="primary-button full-button" type="submit" disabled={!isFormValid}>
                    Xác nhận đặt hàng · {formatPrice(total)}
                  </button>
                </form>

                <aside className="bb-checkout-summary">
                  <h2>Đơn hàng của bạn</h2>
                  <div className="bb-checkout-items">
                    {cart.map((item) => (
                      <article key={item.cartId || item.id}>
                        <div>
                          <strong>{item.name} ×{item.quantity}</strong>
                          <small>{[item.size, item.sugar, item.ice, item.toppings?.length ? item.toppings.join(', ') : ''].filter(Boolean).join(' · ')}</small>
                        </div>
                        <b>{formatPrice(Number(item.price || 0) * Number(item.quantity || 0))}</b>
                      </article>
                    ))}
                  </div>

                  {voucherCode && (
                    <div className="bb-checkout-voucher">
                      <span>Voucher: {voucherCode}</span>
                      <small className={voucherResult.isValid ? 'voucher-success' : 'field-error'}>{voucherResult.message}</small>
                    </div>
                  )}

                  <div className="bb-checkout-price-row"><span>Tạm tính</span><strong>{formatPrice(subtotal)}</strong></div>
                  <div className="bb-checkout-price-row"><span>Giảm giá</span><strong>-{formatPrice(discount)}</strong></div>
                  <div className="bb-checkout-total"><span>Tổng thanh toán</span><strong>{formatPrice(total)}</strong></div>
                </aside>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default CustomerCheckoutPage
