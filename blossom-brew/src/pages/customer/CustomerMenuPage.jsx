import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../../services/authService'
import NotificationDropdown from '../../components/NotificationDropdown'
import CustomerAvatar from '../../components/CustomerAvatar'
import { getProducts } from '../../services/menuService'

const categories = ['Tất cả', 'Cà phê', 'Trà', 'Đá xay', 'Khác']

const navigationItems = [
  { icon: '⌂', label: 'Tổng quan', to: '/customer' },
  { icon: '⌁', label: 'Menu & đặt món', to: '/customer/menu', active: true },
  { icon: '□', label: 'Giỏ hàng', to: '/customer/cart' },
  { icon: '◇', label: 'Điểm & voucher', to: '/customer/points' },
  { icon: '◷', label: 'Lịch sử đơn hàng', to: '/customer/history' },
  { icon: '✦', label: 'Thông báo', to: '/customer/notices' },
  { icon: '☷', label: 'Thông tin cá nhân', to: '/customer/profile' },
]

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString('vi-VN')}đ`
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem('blossom-cart') || '[]')
  } catch {
    return []
  }
}

function getCartSummary() {
  const cart = getCart()

  return {
    count: cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    total: cart.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
      0,
    ),
  }
}

function CustomerMenuPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const initialCart = getCartSummary()
  const [activeCategory, setActiveCategory] = useState('Tất cả')
  const [keyword, setKeyword] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [message, setMessage] = useState('')
  const [cartCount, setCartCount] = useState(initialCart.count)
  const [cartTotal, setCartTotal] = useState(initialCart.total)
  const [voucherCode, setVoucherCode] = useState(
    () => localStorage.getItem('blossom-selected-voucher') || '',
  )
  const [customization, setCustomization] = useState({
    size: 'M',
    sugar: '50% đường',
    ice: 'Đá tiêu chuẩn',
    toppings: [],
    note: '',
  })
  const [products] = useState(() =>
    getProducts().filter((product) => product.available),
  )

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return products.filter((product) => {
      const matchesCategory = activeCategory === 'Tất cả' || product.category === activeCategory
      const matchesKeyword = product.name.toLowerCase().includes(normalizedKeyword)
      return matchesCategory && matchesKeyword
    })
  }, [activeCategory, keyword, products])

  if (!user) return <Navigate to="/login" replace />

  const initials = user.name.split(' ').map((part) => part[0]).slice(-2).join('').toUpperCase()
  const selectedTotal = selectedProduct
    ? Number(selectedProduct.price || 0) + (customization.size === 'L' ? 8000 : 0) + customization.toppings.length * 5000
    : 0

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  function openProduct(product) {
    setSelectedProduct(product)
    setCustomization({
      size: 'M',
      sugar: '50% đường',
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

  function addToCart() {
    if (!selectedProduct) return

    const cart = getCart()
    const item = {
      cartId: String(Date.now()),
      productId: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedTotal,
      quantity: 1,
      size: customization.size,
      sugar: customization.sugar,
      ice: customization.ice,
      toppings: customization.toppings,
      note: customization.note.trim(),
    }

    const updatedCart = [...cart, item]
    localStorage.setItem('blossom-cart', JSON.stringify(updatedCart))
    setCartCount(updatedCart.reduce((sum, cartItem) => sum + Number(cartItem.quantity || 0), 0))
    setCartTotal(updatedCart.reduce((sum, cartItem) => sum + Number(cartItem.price || 0) * Number(cartItem.quantity || 0), 0))
    setSelectedProduct(null)
    setMessage(`${selectedProduct.name} đã được thêm vào giỏ hàng.`)
    window.setTimeout(() => setMessage(''), 2500)
  }

  function removeVoucher() {
    localStorage.removeItem('blossom-selected-voucher')
    setVoucherCode('')
  }

  return (
    <div className="bb-dashboard">
      <aside className="bb-sidebar">
        <button className="bb-brand" type="button" onClick={() => navigate('/')}><span>B</span>Blossom Brew</button>
        <p className="bb-sidebar-label">Customer space</p>
        <nav className="bb-sidebar-nav">
          {navigationItems.map((item) => (
            <button className={item.active ? 'bb-nav-item active' : 'bb-nav-item'} key={item.label} type="button" onClick={() => navigate(item.to)}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="bb-sidebar-profile">
          <span className="bb-avatar">{initials}</span>
          <div><strong>{user.name}</strong><small>Silver member</small></div>
          <button type="button" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </aside>

      <main className="bb-main">
        <header className="bb-topbar">
          <span>MENU & ĐẶT MÓN</span>
          <div className="bb-topbar-actions">
            <NotificationDropdown />
            <button className="bb-cart-button" type="button" onClick={() => navigate('/customer/cart')}>
              Giỏ hàng <b>{cartCount}</b> · {formatPrice(cartTotal)}
            </button>
            <CustomerAvatar />
          </div>
        </header>

        <section className="bb-content">
          <p className="bb-eyebrow">Order online</p>
          <div className="bb-page-heading">
            <div><h1>Chọn món cho hôm nay.</h1><p className="bb-subtitle">Chọn hương vị yêu thích, tuỳ chỉnh món và thêm vào giỏ hàng.</p></div>
          </div>

          {voucherCode && (
            <div className="bb-selected-voucher">
              <div><strong>Voucher đã chọn: {voucherCode}</strong><span>Voucher sẽ được kiểm tra và áp dụng khi thanh toán.</span></div>
              <button type="button" onClick={removeVoucher}>Bỏ chọn</button>
            </div>
          )}

          <div className="bb-menu-toolbar">
            <div className="bb-menu-tabs">
              {categories.map((category) => (
                <button className={activeCategory === category ? 'bb-menu-tab active' : 'bb-menu-tab'} key={category} type="button" onClick={() => setActiveCategory(category)}>{category}</button>
              ))}
            </div>
            <input className="bb-menu-search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm món yêu thích..." />
          </div>

          <div className="bb-menu-product-grid">
            {filteredProducts.map((product, index) => (
              <button className="bb-menu-product-card" key={product.id} type="button" onClick={() => openProduct(product)}>
                <div className={`bb-menu-product-art art-${(index % 3) + 1}`}>☕</div>
                <span className="bb-menu-product-category">{product.category}</span>
                <strong>{product.name}</strong>
                <span className="bb-menu-product-price">{formatPrice(product.price)}</span>
                <span className="bb-menu-add">＋ Thêm</span>
              </button>
            ))}
          </div>
          {filteredProducts.length === 0 && <p className="bb-empty-menu">Chưa tìm thấy món phù hợp.</p>}
        </section>
      </main>

      {message && <div className="bb-menu-toast">{message}</div>}

      {selectedProduct && (
        <div className="bb-menu-modal-overlay" onClick={() => setSelectedProduct(null)}>
          <section className="bb-menu-modal" onClick={(event) => event.stopPropagation()}>
            <button className="bb-menu-close" type="button" onClick={() => setSelectedProduct(null)}>×</button>
            <div className="bb-menu-modal-art">☕</div>
            <p className="bb-eyebrow">{selectedProduct.category}</p>
            <h2>{selectedProduct.name}</h2>
            <p className="bb-menu-description">{selectedProduct.description || 'Thức uống được pha chế tươi mỗi ngày.'}</p>

            <div className="bb-menu-option">
              <span>Chọn size</span>
              <div className="bb-option-buttons">
                <button className={customization.size === 'M' ? 'selected' : ''} type="button" onClick={() => setCustomization((current) => ({ ...current, size: 'M' }))}>Size M · {formatPrice(selectedProduct.price)}</button>
                <button className={customization.size === 'L' ? 'selected' : ''} type="button" onClick={() => setCustomization((current) => ({ ...current, size: 'L' }))}>Size L · {formatPrice(Number(selectedProduct.price) + 8000)}</button>
              </div>
            </div>

            <div className="bb-menu-option">
              <span>Lượng đường</span>
              <div className="bb-option-buttons">
                {['Không đường', '30% đường', '50% đường', '100% đường'].map((item) => <button className={customization.sugar === item ? 'selected' : ''} key={item} type="button" onClick={() => setCustomization((current) => ({ ...current, sugar: item }))}>{item}</button>)}
              </div>
            </div>

            <div className="bb-menu-option">
              <span>Lượng đá</span>
              <div className="bb-option-buttons">
                {['Không đá', 'Ít đá', 'Đá tiêu chuẩn'].map((item) => <button className={customization.ice === item ? 'selected' : ''} key={item} type="button" onClick={() => setCustomization((current) => ({ ...current, ice: item }))}>{item}</button>)}
              </div>
            </div>

            <div className="bb-menu-option">
              <span>Topping</span>
              <div className="bb-topping-list">
                {['Trân châu trắng', 'Thạch đào', 'Kem cheese'].map((topping) => (
                  <label key={topping}><input checked={customization.toppings.includes(topping)} onChange={() => toggleTopping(topping)} type="checkbox" />{topping} (+5.000đ)</label>
                ))}
              </div>
            </div>

            <div className="bb-menu-option">
              <span>Ghi chú cho quán</span>
              <textarea
                className="bb-menu-note"
                maxLength="200"
                value={customization.note}
                onChange={(event) => setCustomization((current) => ({ ...current, note: event.target.value }))}
                placeholder="Ví dụ: không dùng ống hút, ít sữa..."
              />
            </div>

            <button className="primary-button full-button" type="button" onClick={addToCart}>Thêm vào giỏ hàng · {formatPrice(selectedTotal)}</button>
          </section>
        </div>
      )}
    </div>
  )
}

export default CustomerMenuPage
