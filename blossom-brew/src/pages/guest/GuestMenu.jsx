import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts } from '../../services/menuService'

const categories = ['Tất cả', 'Cà phê', 'Trà', 'Khác']

const fallbackDescriptions = {
  'Cold Brew Cam': 'Cold brew · Cam tươi · Đường mía',
  'Latte Hoa Nhài': 'Espresso · Sữa tươi · Hoa nhài',
  'Trà Đào Cam Sả': 'Trà đen · Đào · Cam',
  'Matcha Latte': 'Matcha · Sữa tươi · Vị ngọt dịu',
  'Chocolate Đá Xay': 'Chocolate · Sữa tươi · Đá xay',
  Americano: 'Espresso · Hương vị đậm đà',
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString('vi-VN')}đ`
}

function getProductDescription(product) {
  return product.description || fallbackDescriptions[product.name] || product.category
}

function GuestMenu() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('Tất cả')
  const [keyword, setKeyword] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [products] = useState(() =>
    getProducts().filter((product) => product.available),
  )

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'Tất cả' ||
        product.category === activeCategory ||
        (activeCategory === 'Khác' && product.category === 'Đá xay')

      const matchesKeyword =
        !normalizedKeyword ||
        product.name.toLowerCase().includes(normalizedKeyword)

      return matchesCategory && matchesKeyword
    })
  }, [activeCategory, keyword, products])

  function scrollToMenu() {
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="guest-page" id="top">
      <header className="guest-topbar">
        <div className="guest-header-inner">
          <a className="guest-brand" href="#top">
            <span className="guest-brand-mark">B</span>
            <span>Blossom Brew</span>
          </a>

          <nav aria-label="Điều hướng khách" className="guest-nav">
            <button className="is-active" type="button" onClick={scrollToMenu}>
              Menu
            </button>
            <button type="button" onClick={() => navigate('/login')}>
              Thông báo
            </button>
          </nav>

          <div className="guest-account-actions">
            <button
              className="guest-login-button"
              type="button"
              onClick={() => navigate('/login')}
            >
              Đăng nhập
            </button>
            <button
              className="guest-primary-button guest-register-button"
              type="button"
              onClick={() => navigate('/register')}
            >
              Đăng ký
            </button>
          </div>
        </div>
      </header>

      <main className="guest-main">
        <section className="guest-hero">
          <div className="guest-hero-copy">
            <p className="guest-eyebrow">Blossom Brew · Seasonal Menu</p>
            <h1>Crafted for the quieter moments.</h1>
            <p className="guest-hero-description">
              Một menu được tuyển chọn gọn gàng, dành cho những vị khách muốn
              khám phá hương vị của Blossom Brew trước khi trở thành thành viên.
            </p>

            <div className="guest-hero-actions">
              <button
                className="guest-primary-button"
                type="button"
                onClick={scrollToMenu}
              >
                Khám phá menu
              </button>
              <button
                className="guest-outline-button"
                type="button"
                onClick={() => navigate('/register')}
              >
                Trở thành thành viên
              </button>
            </div>
          </div>

          <div aria-hidden="true" className="guest-hero-art">
            <span className="guest-hero-ring" />
            <span className="guest-steam steam-one" />
            <span className="guest-steam steam-two" />
            <span className="guest-steam steam-three" />
            <span className="guest-saucer" />
            <span className="guest-cup">
              <span>B</span>
              <i />
            </span>
            <small>BLEND<br />2026</small>
          </div>
        </section>

        <section className="guest-menu-section" id="menu">
          <div className="guest-menu-heading">
            <div>
              <p className="guest-eyebrow">Signature selection</p>
              <h2>Chọn một hương vị</h2>
            </div>
            <p>Guest có thể xem menu và chi tiết thức uống.</p>
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
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm thức uống"
            />
          </div>

          <div className="guest-product-grid">
            {filteredProducts.map((product, index) => (
              <button
                className="guest-product-card"
                key={product.id}
                type="button"
                onClick={() => setSelectedProduct(product)}
              >
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
                </span>
              </button>
            ))}
          </div>

          {!filteredProducts.length && (
            <p className="guest-empty-state">Chưa tìm thấy món phù hợp.</p>
          )}
        </section>
      </main>

      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <section
            className="product-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Đóng"
              className="close-button"
              type="button"
              onClick={() => setSelectedProduct(null)}
            >
              ×
            </button>

            <div className="modal-art">☕</div>
            <p className="eyebrow">{selectedProduct.category}</p>
            <h2>{selectedProduct.name}</h2>
            <p className="modal-description">
              {getProductDescription(selectedProduct)}
            </p>
            <p className="modal-price">{formatPrice(selectedProduct.price)}</p>

            <div className="size-row">
              <span>Size M</span>
              <strong>{formatPrice(selectedProduct.price)}</strong>
            </div>
            <div className="size-row">
              <span>Size L</span>
              <strong>{formatPrice(Number(selectedProduct.price) + 8000)}</strong>
            </div>

            <button
              className="primary-button full-button"
              type="button"
              onClick={() => navigate('/register')}
            >
              Đăng ký để đặt món
            </button>
          </section>
        </div>
      )}
    </div>
  )
}

export default GuestMenu
