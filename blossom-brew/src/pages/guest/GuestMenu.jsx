import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts } from '../../services/menuService'


const categories = ['Tất cả', 'Cà phê', 'Trà', 'Đá xay']

function formatPrice(price) {
  return `${price.toLocaleString('vi-VN')}đ`
}

function GuestMenu() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('Tất cả')
  const [keyword, setKeyword] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [message, setMessage] = useState('')
const [products] = useState(() =>
  getProducts().filter((product) => product.available),
)
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchCategory =
        activeCategory === 'Tất cả' || product.category === activeCategory
      const matchKeyword = product.name
        .toLowerCase()
        .includes(keyword.toLowerCase())

      return matchCategory && matchKeyword
    })
  }, [activeCategory, keyword])

  function handleRegister() {
  navigate('/register')
}
  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#top">
          <span className="brand-mark">B</span>
          <span>Blossom Brew</span>
        </a>

        <nav className="main-nav">
          <a className="nav-active" href="#menu">Thực đơn</a>
          <a href="#about">Về chúng tôi</a>
          <a href="#notice">Thông báo</a>
        </nav>

        <div className="header-actions">
  <button
    className="text-button"
    onClick={() => navigate('/login')}
  >
    Đăng nhập
  </button>

  <button className="primary-button" onClick={handleRegister}>
    Đăng ký
  </button>
</div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Blossom Brew collection</p>
            <h1>Một khoảng lặng, trong từng ngụm nhỏ.</h1>
            <p>
              Khám phá những món được pha chế chậm rãi từ hạt cà phê
              và nguyên liệu theo mùa.
            </p>
            <button className="primary-button" onClick={() => {
              document.getElementById('menu').scrollIntoView({ behavior: 'smooth' })
            }}>
              Khám phá thực đơn
            </button>
          </div>

          <div className="hero-art">
            <div className="circle circle-large" />
            <div className="coffee-cup coffee-cup-large">☕</div>
            <span className="hero-note">slow coffee · soft moments</span>
          </div>
        </section>

        <section className="menu-section" id="menu">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Our menu</p>
              <h2>Chọn hương vị cho hôm nay.</h2>
            </div>

            <input
              className="search-input"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm món yêu thích..."
            />
          </div>

          <div className="category-tabs">
            {categories.map((category) => (
              <button
                key={category}
                className={activeCategory === category ? 'tab active' : 'tab'}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="product-grid">
            {filteredProducts.map((product, index) => (
              <article
                className="product-card"
                key={product.id}
                onClick={() => setSelectedProduct(product)}
              >
                <div className={`product-art art-${(index % 3) + 1}`}>
                  <span>☕</span>
                </div>
                <p className="product-category">{product.category}</p>
                <h3>{product.name}</h3>
                <div className="product-footer">
                  <strong>{formatPrice(product.price)}</strong>
                  <span>Xem chi tiết →</span>
                </div>
              </article>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <p className="empty-state">Chưa tìm thấy món phù hợp.</p>
          )}
        </section>

        <section className="member-banner" id="about">
          <div>
            <p className="eyebrow">Become a member</p>
            <h2>Thêm một lý do để quay lại.</h2>
            <p>
              Đăng ký thành viên để tích điểm sau mỗi đơn hàng
              và nhận ưu đãi dành riêng cho bạn.
            </p>
          </div>
          <button className="outline-button" onClick={handleRegister}>
            Đăng ký thành viên
          </button>
        </section>
      </main>

      {message && (
        <div className="toast">
          <span>{message}</span>
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <section className="product-modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="close-button"
              onClick={() => setSelectedProduct(null)}
            >
              ×
            </button>
            <div className="modal-art">☕</div>
            <p className="eyebrow">{selectedProduct.category}</p>
            <h2>{selectedProduct.name}</h2>
            <p className="modal-description">{selectedProduct.description}</p>
            <p className="modal-price">{formatPrice(selectedProduct.price)}</p>
            <div className="size-row">
              <span>Size M</span>
              <strong>{formatPrice(selectedProduct.price)}</strong>
            </div>
            <div className="size-row">
              <span>Size L</span>
              <strong>{formatPrice(selectedProduct.price + 8000)}</strong>
            </div>
            <button className="primary-button full-button" onClick={handleRegister}>
              Đăng ký để đặt món
            </button>
          </section>
        </div>
      )}
    </div>
  )
}

export default GuestMenu