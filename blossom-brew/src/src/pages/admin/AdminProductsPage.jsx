import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../../services/authService'
import { getProducts, saveMenuProducts } from '../../services/menuService'

const categories = ['Tất cả', 'Cà phê', 'Trà', 'Đá xay', 'Khác']
const statusFilters = ['Tất cả', 'Đang bán', 'Tạm ẩn']
const ITEMS_PER_PAGE = 8

function ListFooter({ currentPage, itemLabel, onPageChange, totalItems, totalPages }) {
  const buttonStyle = {
    background: '#fff', border: '1px solid #dfcfc3', color: '#765747', height: '32px', width: '32px',
  }

  return (
    <div style={{ alignItems: 'center', borderTop: '1px solid #eadfd5', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', minHeight: '58px', padding: '0 18px' }}>
      <span style={{ color: '#806858', fontSize: '13px' }}>Tổng số {itemLabel}: <strong style={{ color: '#50382c' }}>{totalItems}</strong></span>
      <div style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
        <button aria-label="Trang trước" disabled={currentPage === 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))} style={{ ...buttonStyle, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }} type="button">{'<'}</button>
        <span style={{ color: '#806858', fontSize: '13px' }}>Trang {currentPage} / {totalPages}</span>
        <button aria-label="Trang sau" disabled={currentPage === totalPages} onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} style={{ ...buttonStyle, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }} type="button">{'>'}</button>
      </div>
    </div>
  )
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString('vi-VN')}đ`
}

function getProductCode(category, products) {
  const prefixes = { 'Cà phê': 'CF', Trà: 'TE', 'Đá xay': 'FR', Khác: 'OT' }
  const prefix = prefixes[category] || 'PR'
  const count = products.filter((product) => product.category === category).length + 1

  return `${prefix}-${String(count).padStart(3, '0')}`
}

function getEmptyForm() {
  return {
    name: '',
    productCode: '',
    category: 'Cà phê',
    price: '',
    available: true,
    image: '',
  }
}

function formatDate(date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function AdminProductsPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [products, setProducts] = useState(getProducts)
  const [form, setForm] = useState(getEmptyForm)
  const [editingId, setEditingId] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Tất cả')
  const [statusFilter, setStatusFilter] = useState('Tất cả')
  const [currentPage, setCurrentPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [message, setMessage] = useState('')

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const keywordValue = keyword.trim().toLowerCase()
        const matchesKeyword = [product.name, product.productCode || '']
          .join(' ')
          .toLowerCase()
          .includes(keywordValue)
        const matchesCategory =
          categoryFilter === 'Tất cả' || product.category === categoryFilter
        const matchesStatus =
          statusFilter === 'Tất cả' ||
          (statusFilter === 'Đang bán' ? product.available : !product.available)

        return matchesKeyword && matchesCategory && matchesStatus
      }),
    [categoryFilter, keyword, products, statusFilter],
  )

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / ITEMS_PER_PAGE),
  )
  const activePage = Math.min(currentPage, totalPages)
  const paginatedProducts = filteredProducts.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE,
  )

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  const navItems = [
    { icon: '⌂', label: 'Tổng quan', to: '/admin' },
    { icon: '⌁', label: 'Quản lý menu', to: '/admin/products', active: true },
    { icon: '□', label: 'Đơn hàng', to: '/admin/orders' },
    { icon: '◦', label: 'Thành viên', to: '/admin/members' },
    { icon: '◇', label: 'Voucher', to: '/admin/vouchers' },
    { icon: '♙', label: 'Tài khoản thu ngân', to: '/admin/cashiers' },
    { icon: '↗', label: 'Báo cáo', to: '/admin/reports' },
    { icon: '✦', label: 'Thông báo', to: '/admin/notices' },
    { icon: '○', label: 'Thông tin cá nhân', to: '/admin/profile' },
  ]

  function saveProducts(updatedProducts) {
    saveMenuProducts(updatedProducts)
    setProducts(updatedProducts)
  }

  function resetForm() {
    setForm(getEmptyForm())
    setEditingId(null)
    setMessage('')
  }

  function closeModal() {
    setIsModalOpen(false)
    resetForm()
  }

  function openCreateModal() {
    resetForm()
    setIsModalOpen(true)
  }

  function handleChange(event) {
    const { name, value, checked, type } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setMessage('')
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0]

    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage('Vui lòng chọn file ảnh hợp lệ.')
      return
    }
    if (file.size > 700 * 1024) {
      setMessage('Ảnh món cần nhỏ hơn 700KB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setForm((current) => ({ ...current, image: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(event) {
    event.preventDefault()
    const price = Number(form.price)
    const name = form.name.trim()

    if (!name || !price || price <= 0) {
      setMessage('Vui lòng nhập tên món và giá bán hợp lệ.')
      return
    }

    const duplicatedName = products.some(
      (product) =>
        product.name.trim().toLowerCase() === name.toLowerCase() &&
        product.id !== editingId,
    )

    if (duplicatedName) {
      setMessage('Tên món này đã tồn tại.')
      return
    }

    const productCode =
      form.productCode.trim().toUpperCase() || getProductCode(form.category, products)
    const duplicatedCode = products.some(
      (product) => product.productCode === productCode && product.id !== editingId,
    )

    if (duplicatedCode) {
      setMessage('Mã món này đã tồn tại.')
      return
    }

    const productData = {
      name,
      productCode,
      category: form.category,
      price,
      available: form.available,
      image: form.image,
    }

    if (editingId) {
      saveProducts(products.map((product) => product.id === editingId ? { ...product, ...productData } : product))
    } else {
      saveProducts([...products, { id: String(Date.now()), ...productData }])
    }

    closeModal()
  }

  function handleEdit(product) {
    setEditingId(product.id)
    setForm({
      name: product.name || '',
      productCode: product.productCode || '',
      category: product.category || 'Cà phê',
      price: String(product.price || ''),
      available: product.available !== false,
      image: product.image || '',
    })
    setMessage('')
    setIsModalOpen(true)
  }

  function handleToggleAvailability(productId) {
    saveProducts(products.map((product) => product.id === productId ? { ...product, available: !product.available } : product))
  }

  function handleDelete(productId = editingId, productName = '') {
    if (!productId) return

    const product = products.find((item) => item.id === productId)
    const name = productName || product?.name || 'món này'
    const confirmed = window.confirm(`Bạn có chắc muốn xóa “${name}”?`)

    if (!confirmed) return

    saveProducts(products.filter((item) => item.id !== productId))

    if (productId === editingId) closeModal()
  }

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  return (
    <div className="admin-dashboard admin-menu-page">
      <aside className="admin-sidebar">
        <button className="admin-brand" type="button" onClick={() => navigate('/admin')}><span>B</span>Blossom Brew</button>
        <p className="admin-sidebar-label">Admin workspace</p>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <button className={item.active ? 'admin-nav-item active' : 'admin-nav-item'} key={item.label} type="button" onClick={() => navigate(item.to)}><span>{item.icon}</span>{item.label}</button>
          ))}
        </nav>
        <div className="admin-profile"><span className="admin-avatar">{initials}</span><div><strong>{user.name}</strong><small>Administrator</small></div><button type="button" onClick={handleLogout}>Đăng xuất</button></div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar"><span>QUẢN LÝ MENU</span><span>{formatDate(new Date())}　✦</span></header>
        <section className="admin-content">
          <div className="admin-menu-heading">
            <div><p className="admin-eyebrow">Catalog management</p><h1>Menu & sản phẩm.</h1><p>Quản lý danh mục, giá bán và trạng thái hiển thị của từng món.</p></div>
            <button className="admin-primary-button" type="button" onClick={openCreateModal}>＋ Thêm món mới</button>
          </div>

          <div className="admin-menu-toolbar">
            <input value={keyword} onChange={(event) => { setKeyword(event.target.value); setCurrentPage(1) }} placeholder="Tìm món theo tên hoặc mã..." />
            <div>
              <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setCurrentPage(1) }}>{categories.map((category) => <option key={category}>{category === 'Tất cả' ? 'Tất cả danh mục' : category}</option>)}</select>
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1) }}>{statusFilters.map((status) => <option key={status}>{status === 'Tất cả' ? 'Trạng thái: Tất cả' : status}</option>)}</select>
            </div>
          </div>

          <section className="admin-menu-table">
            <div className="admin-menu-row admin-menu-header"><span>Ảnh</span><span>Tên sản phẩm</span><span>Danh mục</span><span>Giá bán</span><span>Trạng thái</span><span>Thao tác</span></div>
            {paginatedProducts.map((product) => (
              <div className="admin-menu-row" key={product.id}>
                <span className="admin-product-thumbnail">{product.image ? <img src={product.image} alt={product.name} /> : '☕'}</span>
                <span className="admin-menu-product"><strong>{product.name}</strong><small>{product.productCode || `M-${String(product.id).slice(-3)}`}</small></span>
                <span>{product.category}</span>
                <strong>{formatPrice(product.price)}</strong>
                <span className={product.available ? 'admin-menu-status active' : 'admin-menu-status inactive'}>{product.available ? 'Đang bán' : 'Tạm ẩn'}</span>
                <div className="admin-menu-actions">
                  <button aria-label={`Chỉnh sửa ${product.name}`} title="Chỉnh sửa" type="button" onClick={() => handleEdit(product)}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button aria-label={`Xóa ${product.name}`} className="delete" title="Xóa" type="button" onClick={() => handleDelete(product.id, product.name)}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v5M14 11v5" />
                    </svg>
                  </button>
                  <button aria-checked={product.available} aria-label={product.available ? `Tạm ẩn ${product.name}` : `Hiển thị ${product.name}`} className={product.available ? 'admin-menu-status-switch is-active' : 'admin-menu-status-switch'} role="switch" title={product.available ? 'Tạm ẩn' : 'Hiển thị'} type="button" onClick={() => handleToggleAvailability(product.id)}>
                    <span aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
            {!filteredProducts.length && <p className="admin-empty">Chưa có món phù hợp.</p>}
            <ListFooter currentPage={activePage} itemLabel="món" onPageChange={setCurrentPage} totalItems={products.length} totalPages={totalPages} />
          </section>
        </section>
      </main>

      {isModalOpen && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <section className="admin-product-modal" onClick={(event) => event.stopPropagation()}>
            <button className="admin-modal-close" type="button" onClick={closeModal}>×</button>
            <p className="admin-eyebrow">{editingId ? 'Edit product' : 'New product'}</p>
            <h2>{editingId ? 'Chỉnh sửa món' : 'Thêm món mới'}</h2>
            <form onSubmit={handleSubmit} noValidate>
              <label>TÊN MÓN<input name="name" value={form.name} onChange={handleChange} placeholder="Ví dụ: Cappuccino" /></label>
              <div className="admin-product-form-grid"><label>MÃ MÓN<input name="productCode" value={form.productCode} onChange={handleChange} placeholder="Tự tạo nếu để trống" /></label><label>DANH MỤC<select name="category" value={form.category} onChange={handleChange}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label></div>
              <label>GIÁ BÁN<input name="price" type="number" min="1000" value={form.price} onChange={handleChange} placeholder="Ví dụ: 45000" /></label>
              <label className="admin-image-upload">ẢNH MÓN<input type="file" accept="image/*" onChange={handleImageChange} />{form.image && <img src={form.image} alt="Xem trước" />}</label>
              <label className="admin-checkbox-label"><input name="available" type="checkbox" checked={form.available} onChange={handleChange} />Hiển thị món đang bán</label>
              {message && <p className="admin-form-message">{message}</p>}
              <div className="admin-product-modal-actions">{editingId && <button className="admin-delete-button" type="button" onClick={() => handleDelete()}>Xóa món</button>}<button className="admin-primary-button" type="submit">{editingId ? 'Lưu thay đổi' : 'Thêm món'}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default AdminProductsPage
