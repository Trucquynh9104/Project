import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts } from '../services/menuService'

const categories = ['Tất cả', 'Cà phê', 'Trà', 'Khác']

const fallbackDescriptions = {
  'Cold Brew Cam': 'Cold brew · Cam tươi · Đường mía',
  'Latte Hoa Nhài': 'Espresso · Sữa tươi · Hoa nhài',
  'Trà Đào Cam Sả': 'Trà đen · Đào · Cam',
  'Matcha Latte': 'Matcha · Sữa tươi · Vị ngọt dịu',
  'Chocolate Đá Xay': 'Chocolate · Sữa tươi · Đá xay',
  Americano: 'Espresso · Hương vị đậm đà',
}

const roleContent = {
  customer: {
    eyebrow: 'Blossom Brew · Member home',
    title: 'Crafted for the quieter moments.',
    description: 'Khám phá menu, đặt món và theo dõi ưu đãi ngay trong tài khoản của bạn.',
    primaryLabel: 'Đặt món ngay',
    primaryPath: '/customer/menu',
    secondaryLabel: 'Xem ưu đãi',
    secondaryPath: '/customer/points',
    menuDescription: 'Chọn món yêu thích để bắt đầu đơn hàng của bạn.',
    productPath: '/customer/menu',
  },
  cashier: {
    eyebrow: 'Blossom Brew · Cashier home',
    title: 'Crafted for the quieter moments.',
    description: 'Sẵn sàng phục vụ tại quầy với menu hiện có và các thao tác bán hàng trong ca.',
    primaryLabel: 'Tạo đơn tại quầy',
    primaryPath: '/cashier',
    secondaryLabel: 'Quản lý đơn hàng',
    secondaryPath: '/cashier/orders',
    menuDescription: 'Chọn món để bắt đầu tạo đơn trực tiếp tại quầy.',
    productPath: '/cashier',
  },
  admin: {
    eyebrow: 'Blossom Brew · Admin home',
    title: 'Crafted for the quieter moments.',
    description: 'Theo dõi menu cửa hàng và mở nhanh các tác vụ vận hành của hệ thống.',
    primaryLabel: 'Quản lý menu',
    primaryPath: '/admin/products',
    secondaryLabel: 'Xem tổng quan',
    secondaryPath: '/admin',
    menuDescription: 'Danh sách món hiện đang hiển thị cho khách hàng và thu ngân.',
    productPath: '/admin/products',
  },
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString('vi-VN')}đ`
}

function getProductDescription(product) {
  return product.description || fallbackDescriptions[product.name] || product.category
}

function RoleGuestHome({ role }) {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('Tất cả')
  const [keyword, setKeyword] = useState('')
  const [products] = useState(getProducts)
  const content = roleContent[role] || roleContent.customer

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return products
      .filter((product) => {
        const matchesCategory =
          activeCategory === 'Tất cả' ||
          product.category === activeCategory ||
          (activeCategory === 'Khác' && product.category === 'Đá xay')
        const matchesKeyword = !normalizedKeyword || product.name.toLowerCase().includes(normalizedKeyword)
        return product.available !== false && matchesCategory && matchesKeyword
      })
      .sort((first, second) => Number(first.available === false) - Number(second.available === false))
  }, [activeCategory, keyword, products])

  return (
    <div className={`role-guest-home role-guest-home-${role}`}>
      <section className="guest-hero">
        <div className="guest-hero-copy">
          <p className="guest-eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p className="guest-hero-description">{content.description}</p>

          <div className="guest-hero-actions">
            <button className="guest-primary-button" type="button" onClick={() => navigate(content.primaryPath)}>
              {content.primaryLabel}
            </button>
            <button className="guest-outline-button" type="button" onClick={() => navigate(content.secondaryPath)}>
              {content.secondaryLabel}
            </button>
          </div>
        </div>

        <div className="guest-hero-art guest-photo-art"><img src="/coffee-hero.webp" alt="Tách cà phê latte trong ánh nắng buổi sáng" width="1448" height="1086" /></div>
      </section>

      <section className="guest-menu-section" id={`role-menu-${role}`}>
        <div className="guest-menu-heading">
          <div>
            <p className="guest-eyebrow">Signature selection</p>
            <h2>Chọn một hương vị</h2>
          </div>
          <p>{content.menuDescription}</p>
        </div>

        <div className="guest-menu-controls">
          <div aria-label="Danh mục thức uống" className="guest-category-tabs">
            {categories.map((category) => (
              <button
                className={activeCategory === category ? 'is-active' : ''}
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <input
            aria-label="Tìm thức uống"
            className="guest-search-input"
            placeholder="Tìm thức uống"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>

        <div className="guest-product-grid">
          {filteredProducts.map((product, index) => (
            <button className={product.available ? 'guest-product-card' : 'guest-product-card is-unavailable'} disabled={!product.available} key={product.id} type="button" onClick={() => navigate(content.productPath)}>
              <span className={`guest-product-art tone-${(index % 3) + 1}`}>
                <b>{String(index + 1).padStart(2, '0')}</b>
                <i className="guest-card-ring" />
                <i className="guest-mini-saucer" />
                <i className="guest-mini-cup"><em /></i>
              </span>
              <span className="guest-product-copy">
                <small>{product.category}</small>
                <strong>{product.name}</strong>
                <span>{getProductDescription(product)}</span>
                <b>{formatPrice(product.price)}</b>
                {!product.available && <em className="guest-product-unavailable">Không khả dụng</em>}
              </span>
            </button>
          ))}
        </div>

        {!filteredProducts.length && <p className="guest-empty-state">Chưa tìm thấy món phù hợp.</p>}
      </section>
    </div>
  )
}

export default RoleGuestHome
