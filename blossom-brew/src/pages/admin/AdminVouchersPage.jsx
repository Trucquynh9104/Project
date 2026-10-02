import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../../services/authService'

const VOUCHERS_KEY = 'blossom-vouchers'

const defaultVouchers = [
  {
    id: 'voucher-1',
    code: 'BBSILVER',
    type: 'percent',
    value: 20,
    minOrder: 80000,
    maxDiscount: 30000,
    active: true,
    startDate: '2026-01-01',
    expiry: '2026-12-31',
    requiresSilver: true,
    usedCount: 37,
    usageLimit: 100,
  },
  {
    id: 'voucher-2',
    code: 'WELCOME25',
    type: 'fixed',
    value: 25000,
    minOrder: 60000,
    maxDiscount: 0,
    active: true,
    startDate: '2026-01-01',
    expiry: '2026-12-31',
    requiresSilver: false,
    usedCount: 82,
    usageLimit: 200,
  },
]

function getVouchers() {
  try {
    const saved = localStorage.getItem(VOUCHERS_KEY)

    if (!saved) {
      localStorage.setItem(VOUCHERS_KEY, JSON.stringify(defaultVouchers))
      return defaultVouchers
    }

    const vouchers = JSON.parse(saved)

    if (!Array.isArray(vouchers)) {
      localStorage.setItem(VOUCHERS_KEY, JSON.stringify(defaultVouchers))
      return defaultVouchers
    }

    const migrated = vouchers.map((voucher) => {
      if (voucher.id === 'voucher-1' && voucher.code === 'BBSILVER') {
        return {
          ...voucher,
          startDate: voucher.startDate || '2026-01-01',
          usedCount: Number(voucher.usedCount || 37),
          usageLimit: Number(voucher.usageLimit || 100),
          expiry:
            voucher.expiry === '2026-09-30'
              ? '2026-12-31'
              : voucher.expiry,
          requiresSilver: true,
        }
      }

      if (voucher.id === 'voucher-2' && voucher.code === 'WELCOME25') {
        return {
          ...voucher,
          startDate: voucher.startDate || '2026-01-01',
          usedCount: Number(voucher.usedCount || 82),
          usageLimit: Number(voucher.usageLimit || 200),
          expiry:
            voucher.expiry === '2026-10-15'
              ? '2026-12-31'
              : voucher.expiry,
          requiresSilver: Boolean(voucher.requiresSilver),
        }
      }

      return {
        ...voucher,
        startDate: voucher.startDate || '',
        usedCount: Number(voucher.usedCount || 0),
        usageLimit: Number(voucher.usageLimit || 100),
        requiresSilver: Boolean(voucher.requiresSilver),
      }
    })

    localStorage.setItem(VOUCHERS_KEY, JSON.stringify(migrated))
    return migrated
  } catch {
    localStorage.setItem(VOUCHERS_KEY, JSON.stringify(defaultVouchers))
    return defaultVouchers
  }
}

function formatPrice(price) {
  return Number(price || 0).toLocaleString('vi-VN') + 'đ'
}

function formatDate(value) {
  if (!value) return 'Không giới hạn'

  const [year, month, day] = value.split('-')
  return year && month && day ? day + '/' + month + '/' + year : value
}

function isExpired(expiry) {
  return Boolean(
    expiry && new Date(expiry + 'T23:59:59').getTime() < Date.now(),
  )
}

function getStatus(voucher) {
  if (!voucher.active) return 'Chưa kích hoạt'
  if (isExpired(voucher.expiry)) return 'Hết hạn'
  return 'Đã kích hoạt'
}

function getDescription(voucher) {
  const promotion =
    voucher.type === 'percent'
      ? Number(voucher.maxDiscount || 0) > 0
        ? 'Giảm ' +
          voucher.value +
          '%, tối đa ' +
          formatPrice(voucher.maxDiscount) +
          '.'
        : 'Giảm ' + voucher.value + '%.'
      : 'Giảm ' +
        formatPrice(voucher.value) +
        ' cho đơn từ ' +
        formatPrice(voucher.minOrder) +
        '.'

  return voucher.requiresSilver
    ? promotion + ' Chỉ áp dụng thành viên Silver.'
    : promotion
}

function emptyForm() {
  return {
    code: '',
    type: 'percent',
    value: '',
    minOrder: '',
    maxDiscount: '',
    startDate: '',
    expiry: '',
    active: true,
    requiresSilver: false,
    usageLimit: 100,
  }
}

function AdminVouchersPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [vouchers, setVouchers] = useState(getVouchers)
  const [filter, setFilter] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)

  const filteredVouchers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return vouchers.filter((voucher) => {
      const status = getStatus(voucher)
      const matchedFilter =
        filter === 'all' ||
        (filter === 'active' && status === 'Đã kích hoạt') ||
        (filter === 'inactive' && status === 'Chưa kích hoạt') ||
        (filter === 'expired' && status === 'Hết hạn')
      const matchedKeyword =
        !normalizedKeyword ||
        voucher.code.toLowerCase().includes(normalizedKeyword) ||
        getDescription(voucher).toLowerCase().includes(normalizedKeyword)

      return matchedFilter && matchedKeyword
    })
  }, [filter, keyword, vouchers])

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  function saveVouchers(updatedVouchers) {
    localStorage.setItem(VOUCHERS_KEY, JSON.stringify(updatedVouchers))
    setVouchers(updatedVouchers)
  }

  function resetForm() {
    setForm(emptyForm())
    setEditingId(null)
    setMessage('')
  }

  function openCreateForm() {
    resetForm()
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    resetForm()
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setMessage('')
  }

  function handleSubmit(event) {
    event.preventDefault()

    const code = form.code.trim().toUpperCase()
    const value = Number(form.value)
    const minOrder = Number(form.minOrder || 0)
    const maxDiscount = Number(form.maxDiscount || 0)
    const usageLimit = Number(form.usageLimit || 0)

    if (!code || value <= 0 || minOrder < 0 || usageLimit < 1) {
      setMessage('Vui lòng nhập mã, giá trị giảm và đơn tối thiểu hợp lệ.')
      return
    }

    if (!/^[A-Z0-9_-]+$/.test(code)) {
      setMessage('Mã voucher chỉ gồm chữ in hoa, số, gạch ngang hoặc gạch dưới.')
      return
    }

    if (form.type === 'percent' && value > 100) {
      setMessage('Voucher phần trăm không được vượt quá 100%.')
      return
    }

    if (form.type === 'percent' && maxDiscount < 0) {
      setMessage('Giảm tối đa không hợp lệ.')
      return
    }

    if (form.expiry && isExpired(form.expiry)) {
      setMessage('Hạn sử dụng phải từ hôm nay trở đi.')
      return
    }

    if (form.startDate && form.expiry && form.startDate > form.expiry) {
      setMessage('Ngày bắt đầu phải trước hạn sử dụng.')
      return
    }

    if (
      vouchers.some(
        (voucher) => voucher.code === code && voucher.id !== editingId,
      )
    ) {
      setMessage('Mã voucher này đã tồn tại.')
      return
    }

    const voucherData = {
      code,
      type: form.type,
      value,
      minOrder,
      maxDiscount: form.type === 'percent' ? maxDiscount : 0,
      usageLimit,
      startDate: form.startDate,
      expiry: form.expiry,
      active: form.active,
      requiresSilver: form.requiresSilver,
    }

    if (editingId) {
      saveVouchers(
        vouchers.map((voucher) =>
          voucher.id === editingId
            ? { ...voucher, ...voucherData }
            : voucher,
        ),
      )
      setMessage('Đã cập nhật voucher.')
    } else {
      saveVouchers([
        ...vouchers,
        {
          id: 'voucher-' + Date.now(),
          usedCount: 0,
          ...voucherData,
        },
      ])
      setMessage('Đã thêm voucher.')
    }
  }

  function handleEdit(voucher) {
    setEditingId(voucher.id)
    setForm({
      code: voucher.code,
      type: voucher.type,
      value: String(voucher.value),
      minOrder: String(voucher.minOrder || ''),
      maxDiscount: String(voucher.maxDiscount || ''),
      startDate: voucher.startDate || '',
      expiry: voucher.expiry || '',
      active: Boolean(voucher.active),
      requiresSilver: Boolean(voucher.requiresSilver),
      usageLimit: String(voucher.usageLimit || 100),
    })
    setMessage('')
    setIsFormOpen(true)
  }

  function handleToggle(voucherId) {
    saveVouchers(
      vouchers.map((voucher) =>
        voucher.id === voucherId
          ? { ...voucher, active: !voucher.active }
          : voucher,
      ),
    )
  }

  function handleDelete(voucherId) {
    if (!window.confirm('Bạn có chắc muốn xóa voucher này?')) return

    saveVouchers(vouchers.filter((voucher) => voucher.id !== voucherId))
    if (editingId === voucherId) resetForm()
    else setMessage('Đã xóa voucher.')
  }

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  return (
    <div className="admin-dashboard admin-voucher-page">
      <aside className="admin-sidebar">
        <button
          className="admin-brand"
          type="button"
          onClick={() => navigate('/admin')}
        >
          <span>B</span>
          Blossom Brew
        </button>

        <p className="admin-sidebar-label">Admin workspace</p>

        <nav className="admin-nav">
          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate('/admin')}
          >
            <span>⌂</span>
            Tổng quan
          </button>

          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate('/admin/products')}
          >
            <span>⌁</span>
            Quản lý menu
          </button>

          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate('/admin/orders')}
          >
            <span>□</span>
            Đơn hàng
          </button>

          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate('/admin/members')}
          >
            <span>○</span>
            Thành viên
          </button>

          <button className="admin-nav-item active" type="button">
            <span>◇</span>
            Voucher
          </button>

          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate('/admin/cashiers')}
          >
            <span>♙</span>
            Tài khoản thu ngân
          </button>

          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate('/admin/reports')}
          >
            <span>↗</span>
            Báo cáo
          </button>

          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate('/admin/notices')}
          >
            <span>✦</span>
            Thông báo
          </button>

          <button
            className="admin-nav-item"
            type="button"
            onClick={() => navigate('/admin/profile')}
          >
            <span>○</span>
            Thông tin cá nhân
          </button>
        </nav>

        <div className="admin-profile">
          <span className="admin-avatar">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{user.name}</strong>
            <small>Administrator</small>
          </div>
          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <span>VOUCHER</span>
        </header>

        <section className="admin-content">
          <div className="admin-voucher-heading">
            <div>
              <p className="admin-eyebrow">Promotion management</p>
              <h1>Voucher & ưu đãi.</h1>
              <p>
                Tạo và kiểm soát các ưu đãi đang áp dụng cho thành viên.
              </p>
            </div>

            <button
              className="admin-primary-button admin-create-voucher"
              type="button"
              onClick={openCreateForm}
            >
              ＋ Tạo voucher
            </button>
          </div>

          <div className="admin-voucher-toolbar">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm mã hoặc tên voucher..."
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">Tất cả voucher</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Chưa kích hoạt</option>
              <option value="expired">Đã hết hạn</option>
            </select>
          </div>

          <div className="admin-products-layout">
            <section className="admin-voucher-table">
              <div className="admin-voucher-row admin-voucher-header">
                <span>Mã voucher</span>
                <span>Ưu đãi</span>
                <span>Điều kiện</span>
                <span>Đã dùng</span>
                <span>Hạn dùng</span>
                <span>Trạng thái</span>
                <span>Thao tác</span>
              </div>

              {filteredVouchers.map((voucher) => {
                const status = getStatus(voucher)

                return (
                  <div className="admin-voucher-row" key={voucher.id}>
                    <div>
                      <strong>{voucher.code}</strong>
                    </div>
                    <span className="admin-voucher-offer">
                      {getDescription(voucher)}
                    </span>
                    <span>Từ {formatPrice(voucher.minOrder)}</span>
                    <span>
                      {Number(voucher.usedCount || 0)} /{' '}
                      {voucher.usageLimit || '—'}
                    </span>
                    <span>{formatDate(voucher.expiry)}</span>
                    <button
                      className={
                        status === 'Đã kích hoạt'
                          ? 'admin-available'
                          : 'admin-unavailable'
                      }
                      type="button"
                      onClick={() => handleToggle(voucher.id)}
                    >
                      {status}
                    </button>
                    <div className="admin-product-actions">
                      <button
                        aria-label="Sửa voucher"
                        className="admin-voucher-action-icon"
                        title="Sửa voucher"
                        type="button"
                        onClick={() => handleEdit(voucher)}
                      >
                        ✎
                      </button>
                      <button
                        aria-label="Xóa voucher"
                        className="admin-voucher-action-icon delete"
                        title="Xóa voucher"
                        type="button"
                        onClick={() => handleDelete(voucher.id)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                )
              })}

              {filteredVouchers.length === 0 && (
                <p className="admin-empty">Chưa có voucher phù hợp.</p>
              )}
            </section>

            {isFormOpen && (
              <div
                className="admin-modal-overlay"
                onClick={closeForm}
              >
            <aside
              className="admin-product-form-card admin-voucher-form-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="admin-modal-close"
                type="button"
                onClick={closeForm}
              >
                ×
              </button>
              <p className="admin-eyebrow">
                {editingId ? 'Edit voucher' : 'New voucher'}
              </p>
              <h2>{editingId ? 'Cập nhật voucher' : 'Tạo voucher'}</h2>

              <form onSubmit={handleSubmit} noValidate>
                <label>
                  MÃ VOUCHER
                  <input
                    name="code"
                    value={form.code}
                    onChange={handleChange}
                    placeholder="Ví dụ: WELCOME25"
                  />
                </label>

                <label>
                  LOẠI ƯU ĐÃI
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                  >
                    <option value="percent">Giảm theo phần trăm</option>
                    <option value="fixed">Giảm tiền cố định</option>
                  </select>
                </label>

                <label>
                  {form.type === 'percent'
                    ? 'PHẦN TRĂM GIẢM'
                    : 'SỐ TIỀN GIẢM'}
                  <input
                    name="value"
                    type="number"
                    min="1"
                    value={form.value}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  GIÁ TRỊ ĐƠN TỐI THIỂU
                  <input
                    name="minOrder"
                    type="number"
                    min="0"
                    value={form.minOrder}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  GIỚI HẠN LƯỢT DÙNG
                  <input
                    name="usageLimit"
                    type="number"
                    min="1"
                    value={form.usageLimit}
                    onChange={handleChange}
                    placeholder="Ví dụ: 100"
                  />
                </label>

                {form.type === 'percent' && (
                  <label>
                    GIẢM TỐI ĐA
                    <input
                      name="maxDiscount"
                      type="number"
                      min="0"
                      value={form.maxDiscount}
                      onChange={handleChange}
                      placeholder="Để trống nếu không giới hạn"
                    />
                  </label>
                )}

                <label>
                  NGÀY BẮT ĐẦU
                  <input
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  HẠN SỬ DỤNG
                  <input
                    name="expiry"
                    type="date"
                    value={form.expiry}
                    onChange={handleChange}
                  />
                </label>

                <label className="admin-checkbox-label">
                  <input
                    name="requiresSilver"
                    type="checkbox"
                    checked={form.requiresSilver}
                    onChange={handleChange}
                  />
                  Chỉ áp dụng cho thành viên Silver
                </label>

                <label className="admin-checkbox-label">
                  <input
                    name="active"
                    type="checkbox"
                    checked={form.active}
                    onChange={handleChange}
                  />
                  Kích hoạt voucher
                </label>

                {message && (
                  <p className="admin-form-message">{message}</p>
                )}

                <button className="admin-primary-button" type="submit">
                  {editingId ? 'Lưu thay đổi' : 'Tạo voucher'}
                </button>

                <button
                  className="admin-cancel-button"
                  type="button"
                  onClick={closeForm}
                >
                  Hủy
                </button>
              </form>
            </aside>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default AdminVouchersPage
