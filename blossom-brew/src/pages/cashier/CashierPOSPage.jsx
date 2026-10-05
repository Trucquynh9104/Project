import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  addLoyaltyMember,
  getCurrentUser,
  getLoyaltyMembers,
  getMembershipTier,
  SILVER_MIN_POINTS,
} from '../../services/authService'
import CashierShell from '../../components/CashierShell'

const products = [
  { id: 1, name: 'Cold Brew Cam', category: 'Cà phê', price: 45000 },
  { id: 2, name: 'Latte Hoa Nhài', category: 'Cà phê', price: 52000 },
  { id: 3, name: 'Trà Đào Cam Sả', category: 'Trà', price: 49000 },
  { id: 4, name: 'Chocolate Đá Xay', category: 'Khác', price: 55000 },
  { id: 5, name: 'Matcha Latte', category: 'Trà', price: 59000 },
  { id: 6, name: 'Americano', category: 'Cà phê', price: 39000 },
]

const categories = ['Tất cả', 'Cà phê', 'Trà', 'Khác']

const vouchers = [
  {
    code: 'BBSILVER',
    type: 'percent',
    value: 20,
    maxDiscount: 30000,
    minOrder: 80000,
    requiresSilver: true,
  },
  {
    code: 'WELCOME25',
    type: 'fixed',
    value: 25000,
    minOrder: 60000,
  },
]

function formatPrice(price) {
  return `${price.toLocaleString('vi-VN')}đ`
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function CashierPOSPage() {
  const user = getCurrentUser()
  const [category, setCategory] = useState('Tất cả')
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [memberPhone, setMemberPhone] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberLookupError, setMemberLookupError] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const [message, setMessage] = useState('')
  const [voucherInput, setVoucherInput] = useState('')
  const [appliedVoucher, setAppliedVoucher] = useState(null)
  const [toast, setToast] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [customization, setCustomization] = useState({
    size: 'M',
    sugar: '50%',
    ice: 'Đá tiêu chuẩn',
    toppings: [],
    note: '',
  })

  const filteredProducts = useMemo(() => {
    if (category === 'Tất cả') return products
    return products.filter((product) => product.category === category)
  }, [category])

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )

  const appliedVoucherIsEligible =
    appliedVoucher &&
    total >= appliedVoucher.minOrder &&
    (!appliedVoucher.requiresSilver || selectedMember?.points >= SILVER_MIN_POINTS)

  const discountAmount = appliedVoucherIsEligible
    ? appliedVoucher.type === 'percent'
      ? Math.min(
          Math.round((total * appliedVoucher.value) / 100),
          appliedVoucher.maxDiscount,
        )
      : Math.min(appliedVoucher.value, total)
    : 0

  const finalTotal = Math.max(total - discountAmount, 0)

  // Tổng của món đang mở popup: giá riêng của món + size L + topping.
  const selectedTotal = selectedProduct
    ? selectedProduct.price +
      (customization.size === 'L' ? 8000 : 0) +
      customization.toppings.length * 5000
    : 0

  if (!user || user.role !== 'cashier') {
    return <Navigate to="/login" replace />
  }

  function openProductModal(product) {
    setSelectedProduct(product)
    setCustomization({
      size: 'M',
      sugar: '50%',
      ice: 'Đá tiêu chuẩn',
      toppings: [],
      note: '',
    })
  }

  function toggleTopping(topping) {
    setCustomization((current) => ({
      ...current,
      toppings: current.toppings.includes(topping)
        ? current.toppings.filter((item) => item !== topping)
        : [...current.toppings, topping],
    }))
  }

  function confirmAddToCart() {
    if (!selectedProduct) return

    const cartItem = {
      ...selectedProduct,
      id: `${selectedProduct.id}-${Date.now()}`,
      quantity: 1,
      size: customization.size,
      sugar: customization.sugar,
      ice: customization.ice,
      toppings: customization.toppings,
      note: customization.note.trim(),
      price: selectedTotal,
    }

    setCart((currentCart) => [...currentCart, cartItem])
    setSelectedProduct(null)
  }

  function changeQuantity(productId, amount) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + amount }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
  }

  function showToast(type, text) {
    setToast({ type, text })
    window.setTimeout(() => setToast(null), 3200)
  }

  function applyVoucher() {
    const code = voucherInput.trim().toUpperCase()
    const voucher = vouchers.find((item) => item.code === code)

    if (!code) {
      showToast('error', 'Vui lòng nhập mã voucher.')
      return
    }

    if (!voucher) {
      showToast('error', 'Voucher không hợp lệ hoặc đã hết hạn.')
      return
    }

    if (total < voucher.minOrder) {
      showToast(
        'error',
        `Voucher ${voucher.code} áp dụng cho đơn từ ${formatPrice(voucher.minOrder)}.`,
      )
      return
    }

    if (voucher.requiresSilver && (!selectedMember || selectedMember.points < SILVER_MIN_POINTS)) {
      showToast('error', 'Voucher BBSILVER chỉ áp dụng cho thành viên Silver.')
      return
    }

    setAppliedVoucher(voucher)
    setVoucherInput(voucher.code)
    showToast('success', `Áp dụng ${voucher.code} thành công.`)
  }

  function removeVoucher() {
    setAppliedVoucher(null)
    setVoucherInput('')
    showToast('success', 'Đã bỏ voucher khỏi đơn hàng.')
  }

  function findMember() {
    const normalizedPhone = memberPhone.replace(/\D/g, '')

    if (!normalizedPhone) {
      setSelectedMember(null)
      setMemberLookupError('Vui lòng nhập số điện thoại để tìm thành viên.')
      setShowAddMember(false)
      return
    }

    const member = getLoyaltyMembers().find(
      (item) => item.phone.replace(/\D/g, '') === normalizedPhone,
    )

    if (!member) {
      setSelectedMember(null)
      setMemberLookupError('Không tìm thấy thành viên có số điện thoại này.')
      setShowAddMember(false)
      return
    }

    setSelectedMember(member)
    setMemberPhone(member.phone)
    setMemberLookupError('')
    setShowAddMember(false)
  }

  function handleAddMember() {
    const result = addLoyaltyMember({
      name: newMemberName,
      phone: memberPhone,
    })

    if (!result.ok) {
      setMemberLookupError(result.message)
      return
    }

    setSelectedMember(result.member)
    setMemberPhone(result.member.phone)
    setMemberLookupError('')
    setNewMemberName('')
    setShowAddMember(false)
  }

  function handleNewOrder() {
    setCart([])
    setMemberPhone('')
    setSelectedMember(null)
    setMemberLookupError('')
    setShowAddMember(false)
    setNewMemberName('')
    setPaymentMethod('cash')
    setMessage('')
    setVoucherInput('')
    setAppliedVoucher(null)
  }

  function handleConfirmPayment() {
    if (cart.length === 0) {
      setMessage('Vui lòng chọn ít nhất một món.')
      return
    }

    const order = {
      id: `#BB-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      time: formatDateTime(new Date()),
      product: cart.map((item) => `${item.name} ×${item.quantity}`).join(', '),
      options: 'Đơn tại quầy',
      items: cart,
      total: finalTotal,
      subtotal: total,
      discount: discountAmount,
      voucherCode: appliedVoucher?.code || '',
      orderType: 'counter',
      paymentMethod,
      receiver: selectedMember ? selectedMember.name : 'Khách vãng lai',
      member: selectedMember
        ? {
            id: selectedMember.id,
            name: selectedMember.name,
            phone: selectedMember.phone,
            points: selectedMember.points,
          }
        : null,
      status: 'Đang pha',
      group: 'incomplete',
    }

    const savedOrders = JSON.parse(
      localStorage.getItem('blossom-orders') || '[]',
    )

    localStorage.setItem(
      'blossom-orders',
      JSON.stringify([order, ...savedOrders]),
    )

    setMessage(`Đã tạo đơn ${order.id} và chuyển sang trạng thái Đang pha.`)
    setCart([])
    setMemberPhone('')
    setSelectedMember(null)
    setMemberLookupError('')
    setShowAddMember(false)
    setNewMemberName('')
    setVoucherInput('')
    setAppliedVoucher(null)
  }

  return (
    <>
      <CashierShell
        active="pos"
        className="cashier-pos-page"
        topbarDescription="Chọn món, tìm thành viên và hoàn tất thanh toán cho khách."
        topbarTitle="Tạo đơn tại quầy."
        user={user}
      >
        <section className="cashier-content">
          <div className="cashier-page-actions">
            <button className="cashier-outline-button" type="button" onClick={handleNewOrder}>
              ＋ Đơn mới
            </button>
          </div>

          <div className="cashier-pos-layout">
            <section className="cashier-menu-panel">
              <div className="cashier-tabs">
                {categories.map((item) => (
                  <button
                    className={category === item ? 'active' : ''}
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="cashier-product-grid">
                {filteredProducts.map((product) => (
                  <button
                    className="cashier-product-card"
                    key={product.id}
                    type="button"
                    onClick={() => openProductModal(product)}
                  >
                    <div className="cashier-product-image">☕</div>
                    <small>{product.category}</small>
                    <strong>{product.name}</strong>
                    <b>{formatPrice(product.price)}</b>
                  </button>
                ))}
              </div>
            </section>

            <aside className="cashier-order-panel">
              <h2>Đơn hàng mới</h2>

              <div className="cashier-member-box">
                <label htmlFor="member-phone">THÀNH VIÊN / SỐ ĐIỆN THOẠI</label>

                <div className="cashier-member-search">
                  <input
                    id="member-phone"
                    value={memberPhone}
                    placeholder="090 123 4567"
                    onChange={(event) => {
                      setMemberPhone(event.target.value)
                      setSelectedMember(null)
                      setMemberLookupError('')
                      setShowAddMember(false)
                    }}
                  />
                  <button type="button" onClick={findMember}>
                    Tìm
                  </button>
                </div>

                {selectedMember && (
                  <div className="cashier-member-result">
                    <strong>✓ {selectedMember.name}</strong>
                    <br />
                    <span>
                      {selectedMember.phone} · {getMembershipTier(selectedMember.points)} · {selectedMember.points} điểm
                    </span>
                  </div>
                )}

                {memberLookupError && (
                  <div className="cashier-member-not-found">
                    <span>{memberLookupError}</span>
                    {!showAddMember && memberPhone.trim() && (
                      <button
                        type="button"
                        onClick={() => setShowAddMember(true)}
                      >
                        + Thêm thành viên
                      </button>
                    )}
                  </div>
                )}

                {showAddMember && (
                  <div className="cashier-add-member-form">
                    <input
                      value={newMemberName}
                      onChange={(event) => setNewMemberName(event.target.value)}
                      placeholder="Nhập tên thành viên"
                    />
                    <button type="button" onClick={handleAddMember}>
                      Lưu thành viên
                    </button>
                  </div>
                )}
              </div>

              <div className="cashier-order-items">
                {cart.length === 0 && (
                  <p className="cashier-empty-cart">Chưa có món nào trong đơn.</p>
                )}

                {cart.map((item) => (
                  <div className="cashier-order-item" key={item.id}>
                    <div className="cashier-order-item-info">
                      <strong>{item.name}</strong>
                      <small>
                        Size {item.size} · Đường {item.sugar} · {item.ice}
                        {item.toppings.length > 0 && ` · ${item.toppings.join(', ')}`}
                        {item.note && ` · Ghi chú: ${item.note}`}
                      </small>
                    </div>

                    <strong
                      className="cashier-item-price"
                      style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}
                    >
                      {formatPrice(item.price * item.quantity)}
                    </strong>

                    <div className="cashier-quantity">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, -1)}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, 1)}
                      >
                        ＋
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cashier-voucher-box">
                <label htmlFor="cashier-voucher">MÃ ƯU ĐÃI</label>
                <div className="cashier-voucher-input">
                  <input
                    id="cashier-voucher"
                    value={voucherInput}
                    onChange={(event) => setVoucherInput(event.target.value)}
                    placeholder="Nhập mã voucher"
                  />
                  <button type="button" onClick={applyVoucher}>
                    Áp dụng
                  </button>
                </div>

                {appliedVoucher && (
                  <p className="cashier-applied-voucher">
                    <span>
                      {appliedVoucherIsEligible
                        ? `✓ Đã áp dụng ${appliedVoucher.code}`
                        : `! ${appliedVoucher.code} không còn đủ điều kiện`}
                    </span>
                    <button type="button" onClick={removeVoucher}>
                      Bỏ
                    </button>
                  </p>
                )}
              </div>

              <div className="cashier-price-row">
                <span>Tạm tính</span>
                <strong>{formatPrice(total)}</strong>
              </div>

              <div className="cashier-price-row">
                <span>Giảm giá</span>
                <strong>-{formatPrice(discountAmount)}</strong>
              </div>

              <div className="cashier-total-row">
                <span>Tổng thanh toán</span>
                <strong>{formatPrice(finalTotal)}</strong>
              </div>

              <div className="cashier-payment-methods">
                <button
                  className={paymentMethod === 'cash' ? 'active' : ''}
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                >
                  Tiền mặt
                </button>
                <button
                  className={paymentMethod === 'qr' ? 'active' : ''}
                  type="button"
                  onClick={() => setPaymentMethod('qr')}
                >
                  QR
                </button>
                <button
                  className={paymentMethod === 'card' ? 'active' : ''}
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                >
                  Thẻ
                </button>
              </div>

              <button
                className="cashier-confirm-button"
                type="button"
                onClick={handleConfirmPayment}
              >
                Xác nhận thanh toán · {formatPrice(finalTotal)}
              </button>

              {message && <p className="cashier-message">{message}</p>}
            </aside>
          </div>
        </section>
      </CashierShell>

      {selectedProduct && (
        <div
          className="cashier-modal-overlay"
          onClick={() => setSelectedProduct(null)}
        >
          <section
            className="cashier-product-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="cashier-modal-close"
              type="button"
              onClick={() => setSelectedProduct(null)}
            >
              ×
            </button>

            <div className="cashier-modal-image">☕</div>
            <p className="cashier-eyebrow">{selectedProduct.category}</p>
            <h2>{selectedProduct.name}</h2>
            <p className="cashier-modal-base-price">
              Giá gốc: {formatPrice(selectedProduct.price)}
            </p>

            <div className="cashier-customization-group">
              <strong>Chọn size</strong>
              <div className="cashier-option-row">
                <button
                  className={customization.size === 'M' ? 'active' : ''}
                  type="button"
                  onClick={() =>
                    setCustomization((current) => ({ ...current, size: 'M' }))
                  }
                >
                  Size M · {formatPrice(selectedProduct.price)}
                </button>
                <button
                  className={customization.size === 'L' ? 'active' : ''}
                  type="button"
                  onClick={() =>
                    setCustomization((current) => ({ ...current, size: 'L' }))
                  }
                >
                  Size L · {formatPrice(selectedProduct.price + 8000)}
                </button>
              </div>
            </div>

            <div className="cashier-customization-group">
              <strong>Lượng đường</strong>
              <div className="cashier-option-row">
                {['Không đường', '30%', '50%', '100%'].map((sugar) => (
                  <button
                    className={customization.sugar === sugar ? 'active' : ''}
                    key={sugar}
                    type="button"
                    onClick={() =>
                      setCustomization((current) => ({ ...current, sugar }))
                    }
                  >
                    {sugar}
                  </button>
                ))}
              </div>
            </div>

            <div className="cashier-customization-group">
              <strong>Lượng đá</strong>
              <div className="cashier-option-row">
                {['Không đá', 'Ít đá', 'Đá tiêu chuẩn'].map((ice) => (
                  <button
                    className={customization.ice === ice ? 'active' : ''}
                    key={ice}
                    type="button"
                    onClick={() =>
                      setCustomization((current) => ({ ...current, ice }))
                    }
                  >
                    {ice}
                  </button>
                ))}
              </div>
            </div>

            <div className="cashier-customization-group">
              <strong>Topping · 5.000đ/món</strong>
              <div className="cashier-topping-list">
                {['Trân châu trắng', 'Thạch đào', 'Kem cheese'].map((topping) => (
                  <label key={topping}>
                    <input
                      checked={customization.toppings.includes(topping)}
                      type="checkbox"
                      onChange={() => toggleTopping(topping)}
                    />
                    {topping}
                  </label>
                ))}
              </div>
            </div>

            <div className="cashier-customization-group">
              <strong>Ghi chú</strong>
              <textarea
                value={customization.note}
                placeholder="Ví dụ: không dùng ống hút, giao sau 10 phút..."
                maxLength="150"
                onChange={(event) =>
                  setCustomization((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
              />
            </div>

            <button
              className="cashier-confirm-button"
              type="button"
              onClick={confirmAddToCart}
            >
              Xác nhận thêm món · {formatPrice(selectedTotal)}
            </button>
          </section>
        </div>
      )}

      {toast && (
        <div className={`cashier-toast ${toast.type}`} role="status">
          {toast.text}
        </div>
      )}
    </>
  )
}

export default CashierPOSPage
