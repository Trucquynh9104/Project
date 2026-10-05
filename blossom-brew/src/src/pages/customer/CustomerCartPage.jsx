import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  getCurrentUser,
  getMembershipLabel,
  getPersonalVouchers,
  logoutUser,
  SILVER_MIN_POINTS,
} from '../../services/authService'
import NotificationDropdown from '../../components/NotificationDropdown'
import CustomerAvatar from '../../components/CustomerAvatar'

const navigationItems = [
  { icon: '⌂', label: 'Tổng quan', to: '/customer' },
  { icon: '⌁', label: 'Menu & đặt món', to: '/customer/menu' },
  { icon: '□', label: 'Giỏ hàng', to: '/customer/cart', active: true },
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
      requiresSilver: false,
    },
  ]

  try {
    const savedVouchers = localStorage.getItem('blossom-vouchers')
    return savedVouchers ? JSON.parse(savedVouchers) : defaults
  } catch {
    return defaults
  }
}

function isExpired(expiry) {
  return Boolean(expiry && new Date(`${expiry}T23:59:59`) < new Date())
}

function getVoucherResult({ voucherCode, user, subtotal }) {
  if (!voucherCode) {
    return { discount: 0, message: '', isValid: false }
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
      }
    }

    return {
      discount: Math.min(Number(personalVoucher.discount || 0), subtotal),
      message: `Đã áp dụng voucher ${personalVoucher.code}.`,
      isValid: true,
    }
  }

  const adminVoucher = getAdminVouchers().find(
    (voucher) => voucher.code === voucherCode,
  )

  if (!adminVoucher) {
    return {
      discount: 0,
      message: 'Voucher không hợp lệ hoặc đã được sử dụng.',
      isValid: false,
    }
  }

  if (!adminVoucher.active) {
    return {
      discount: 0,
      message: 'Voucher này hiện đã được tắt.',
      isValid: false,
    }
  }

  if (isExpired(adminVoucher.expiry)) {
    return {
      discount: 0,
      message: 'Voucher này đã hết hạn.',
      isValid: false,
    }
  }

  if (
    adminVoucher.requiresSilver &&
    Number(user.points || 0) < SILVER_MIN_POINTS
  ) {
    return {
      discount: 0,
      message: 'Voucher này chỉ áp dụng cho thành viên Silver từ 50 điểm.',
      isValid: false,
    }
  }

  if (subtotal < Number(adminVoucher.minOrder || 0)) {
    return {
      discount: 0,
      message: `Voucher áp dụng cho đơn từ ${formatPrice(
        adminVoucher.minOrder,
      )}.`,
      isValid: false,
    }
  }

  const rawDiscount =
    adminVoucher.type === 'percent'
      ? Math.round((subtotal * Number(adminVoucher.value || 0)) / 100)
      : Number(adminVoucher.value || 0)

  const maxDiscount = Number(adminVoucher.maxDiscount || 0)
  const discount =
    adminVoucher.type === 'percent' && maxDiscount > 0
      ? Math.min(rawDiscount, maxDiscount, subtotal)
      : Math.min(rawDiscount, subtotal)

  return {
    discount,
    message: `Đã áp dụng voucher ${adminVoucher.code}.`,
    isValid: true,
  }
}

function CustomerCartPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [cart, setCart] = useState(getCart)
  const [voucherCode, setVoucherCode] = useState(() =>
    localStorage.getItem('blossom-selected-voucher') || '',
  )

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    )
  }, [cart])

  const voucherResult = useMemo(() => {
    if (!user) {
      return { discount: 0, message: '', isValid: false }
    }

    return getVoucherResult({ voucherCode, user, subtotal })
  }, [subtotal, user, voucherCode])

  const discount = voucherResult.discount
  const total = Math.max(subtotal - discount, 0)
  const cartCount = cart.reduce(
    (totalItem, item) => totalItem + Number(item.quantity || 0),
    0,
  )

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const membershipLabel = getMembershipLabel(user.points)

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  function saveCart(updatedCart) {
    setCart(updatedCart)
    localStorage.setItem('blossom-cart', JSON.stringify(updatedCart))
  }

  function changeQuantity(cartId, amount) {
    const updatedCart = cart
      .map((item) =>
        item.cartId === cartId
          ? { ...item, quantity: Number(item.quantity || 0) + amount }
          : item,
      )
      .filter((item) => item.quantity > 0)

    saveCart(updatedCart)
  }

  function removeItem(cartId) {
    saveCart(cart.filter((item) => item.cartId !== cartId))
  }

  function removeVoucher() {
    localStorage.removeItem('blossom-selected-voucher')
    setVoucherCode('')
  }

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  return (
    <div className="bb-dashboard">
      <aside className="bb-sidebar">
        <button
          className="bb-brand"
          type="button"
          onClick={() => navigate('/')}
        >
          <span>B</span>
          Blossom Brew
        </button>

        <p className="bb-sidebar-label">Customer space</p>

        <nav className="bb-sidebar-nav">
          {navigationItems.map((item) => (
            <button
              className={item.active ? 'bb-nav-item active' : 'bb-nav-item'}
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
            >
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

          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="bb-main">
        <header className="bb-topbar">
          <span>GIỎ HÀNG</span>

          <div className="bb-topbar-actions">
            <NotificationDropdown />

            <button
              className="bb-cart-button"
              type="button"
              onClick={() => navigate('/customer/cart')}
            >
              Giỏ hàng <b>{cartCount}</b> · {formatPrice(subtotal)}
            </button>

            <CustomerAvatar />
          </div>
        </header>

        <section className="bb-content">
          <p className="bb-eyebrow">Your order</p>

          <div className="bb-page-heading">
            <div>
              <h1>Giỏ hàng của bạn.</h1>
              <p className="bb-subtitle">
                Kiểm tra lại món đã chọn trước khi đến bước thanh toán.
              </p>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="bb-empty-cart">
              <h2>Giỏ hàng đang trống.</h2>
              <p>Hãy chọn một món yêu thích để bắt đầu đơn hàng.</p>

              <button
                className="primary-button"
                type="button"
                onClick={() => navigate('/customer/menu')}
              >
                ← Tiếp tục chọn món
              </button>
            </div>
          ) : (
            <div className="bb-cart-layout">
              <div className="bb-cart-list">
                {cart.map((item) => (
                  <article className="bb-cart-item" key={item.cartId}>
                    <div className="bb-cart-item-art">☕</div>

                    <div className="bb-cart-item-info">
                      <h3>{item.name}</h3>

                      <p>
                        Size {item.size} · {item.sugar} · {item.ice}
                      </p>

                      <small>
                        {item.toppings?.length
                          ? `Topping: ${item.toppings.join(', ')}`
                          : 'Không topping'}
                      </small>

                      {item.note && (
                        <small className="bb-cart-item-note">
                          Ghi chú: {item.note}
                        </small>
                      )}

                      <strong>
                        {formatPrice(
                          Number(item.price || 0) * Number(item.quantity || 0),
                        )}
                      </strong>
                    </div>

                    <div className="bb-cart-actions">
                      <button
                        className="bb-remove-item"
                        type="button"
                        onClick={() => removeItem(item.cartId)}
                      >
                        Xoá
                      </button>

                      <div className="bb-quantity-control">
                        <button
                          type="button"
                          onClick={() => changeQuantity(item.cartId, -1)}
                        >
                          −
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          type="button"
                          onClick={() => changeQuantity(item.cartId, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </article>
                ))}

                <button
                  className="bb-back-to-menu"
                  type="button"
                  onClick={() => navigate('/customer/menu')}
                >
                  ← Tiếp tục chọn món
                </button>
              </div>

              <aside className="bb-order-summary">
                <p className="bb-eyebrow">Order summary</p>
                <h2>Tóm tắt đơn hàng</h2>

                <div className="bb-summary-line">
                  <span>Tạm tính</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>

                {voucherCode ? (
                  <div className="bb-cart-voucher">
                    <div>
                      <strong>Voucher: {voucherCode}</strong>
                      <span
                        className={
                          voucherResult.isValid
                            ? 'voucher-success'
                            : 'field-error'
                        }
                      >
                        {voucherResult.message}
                      </span>
                    </div>

                    <button type="button" onClick={removeVoucher}>
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    className="bb-choose-voucher"
                    type="button"
                    onClick={() => navigate('/customer/points')}
                  >
                    + Chọn voucher
                  </button>
                )}

                <div className="bb-summary-line">
                  <span>Giảm giá</span>
                  <strong>-{formatPrice(discount)}</strong>
                </div>

                <div className="bb-summary-total">
                  <span>Tổng thanh toán</span>
                  <strong>{formatPrice(total)}</strong>
                </div>

                <button
                  className="primary-button full-button"
                  type="button"
                  onClick={() => navigate('/customer/checkout')}
                >
                  Tiến hành thanh toán
                </button>
              </aside>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default CustomerCartPage
