import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../../services/authService'

const USERS_KEY = 'blossom-brew-users'

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  } catch {
    return []
  }
}

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem('blossom-orders') || '[]')
  } catch {
    return []
  }
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date)
}

function emptyForm() {
  return {
    name: '',
    email: '',
    phone: '',
    password: '',
    active: true,
  }
}

function AdminCashiersPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [users, setUsers] = useState(getUsers)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [message, setMessage] = useState('')

  const orders = useMemo(getOrders, [])
  const cashiers = useMemo(
    () => users.filter((account) => account.role === 'cashier'),
    [users],
  )

  const filteredCashiers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return cashiers.filter((cashier) => {
      const matchedKeyword =
        !normalizedKeyword ||
        [cashier.name, cashier.email, cashier.phone]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword)
      const isActive = cashier.active !== false
      const matchedStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? isActive : !isActive)

      return matchedKeyword && matchedStatus
    })
  }, [cashiers, keyword, statusFilter])

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
    { icon: '⌁', label: 'Quản lý menu', to: '/admin/products' },
    { icon: '□', label: 'Đơn hàng', to: '/admin/orders' },
    { icon: '◦', label: 'Thành viên', to: '/admin/members' },
    { icon: '◇', label: 'Voucher', to: '/admin/vouchers' },
    { icon: '♙', label: 'Tài khoản thu ngân', to: '/admin/cashiers', active: true },
    { icon: '↗', label: 'Báo cáo', to: '/admin/reports' },
    { icon: '✦', label: 'Thông báo', to: '/admin/notices' },
    { icon: '○', label: 'Thông tin cá nhân', to: '/admin/profile' },
  ]

  function saveUsers(updatedUsers) {
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers))
    setUsers(updatedUsers)
  }

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  function closeModal() {
    setIsModalOpen(false)
    setEditingId(null)
    setForm(emptyForm())
    setMessage('')
  }

  function openCreateModal() {
    setForm(emptyForm())
    setEditingId(null)
    setMessage('')
    setIsModalOpen(true)
  }

  function openEditModal(cashier) {
    setForm({
      name: cashier.name || '',
      email: cashier.email || '',
      phone: cashier.phone || '',
      password: '',
      active: cashier.active !== false,
    })
    setEditingId(cashier.id)
    setMessage('')
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

  function handleSubmit(event) {
    event.preventDefault()
    const normalizedEmail = form.email.trim().toLowerCase()

    if (!form.name.trim() || !normalizedEmail) {
      setMessage('Vui lòng nhập họ tên và email.')
      return
    }

    if (!editingId && form.password.length < 8) {
      setMessage('Mật khẩu cần ít nhất 8 ký tự.')
      return
    }

    const emailInUse = users.some(
      (account) => account.email === normalizedEmail && account.id !== editingId,
    )

    if (emailInUse) {
      setMessage('Email này đã được sử dụng.')
      return
    }

    if (editingId) {
      saveUsers(users.map((account) =>
        account.id === editingId
          ? {
              ...account,
              name: form.name.trim(),
              email: normalizedEmail,
              phone: form.phone.trim(),
              active: form.active,
              ...(form.password ? { password: form.password } : {}),
            }
          : account,
      ))
    } else {
      saveUsers([
        ...users,
        {
          id: `cashier-${Date.now()}`,
          name: form.name.trim(),
          email: normalizedEmail,
          phone: form.phone.trim(),
          password: form.password,
          role: 'cashier',
          points: 0,
          active: true,
          createdAt: new Date().toISOString(),
        },
      ])
    }

    closeModal()
  }

  function toggleStatus(cashier) {
    saveUsers(users.map((account) =>
      account.id === cashier.id
        ? { ...account, active: account.active === false }
        : account,
    ))
  }

  return (
    <div className="admin-dashboard admin-cashiers-page">
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
        <header className="admin-topbar"><span>TÀI KHOẢN THU NGÂN</span><span>Quản lý nhân sự tại quầy</span></header>
        <section className="admin-content">
          <div className="admin-cashiers-heading">
            <div><p className="admin-eyebrow">Cashier management</p><h1>Tài khoản thu ngân.</h1><p>Quản lý quyền truy cập của nhân viên tại quầy.</p></div>
            <button className="admin-primary-button" type="button" onClick={openCreateModal}>＋ Thêm thu ngân</button>
          </div>

          <div className="admin-cashiers-toolbar">
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm tên, email hoặc số điện thoại..." />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="inactive">Tạm ngưng</option></select>
          </div>

          <section className="admin-cashiers-table">
            <div className="admin-cashiers-row admin-cashiers-header"><span>Thu ngân</span><span>Liên hệ</span><span>Ngày tạo</span><span>Đơn tại quầy</span><span>Trạng thái</span><span>Thao tác</span></div>
            {filteredCashiers.map((cashier) => {
              const cashierOrderCount = orders.filter((order) => order.cashierId === cashier.id).length
              const isActive = cashier.active !== false
              return <div className="admin-cashiers-row" key={cashier.id}>
                <span className="admin-cashier-name"><strong>{cashier.name}</strong><small>Cashier</small></span>
                <span className="admin-cashier-contact"><strong>{cashier.email}</strong><small>{cashier.phone || 'Chưa cập nhật SĐT'}</small></span>
                <span>{formatDate(cashier.createdAt)}</span><span>{cashierOrderCount} đơn</span>
                <span className={isActive ? 'admin-cashier-status active' : 'admin-cashier-status inactive'}>{isActive ? 'Hoạt động' : 'Tạm ngưng'}</span>
                <span className="admin-cashier-actions"><button type="button" onClick={() => openEditModal(cashier)}>Sửa</button><button type="button" onClick={() => toggleStatus(cashier)}>{isActive ? 'Tạm ngưng' : 'Kích hoạt'}</button></span>
              </div>
            })}
            {!filteredCashiers.length && <p className="admin-empty">Chưa có tài khoản thu ngân phù hợp.</p>}
          </section>
        </section>
      </main>

      {isModalOpen && <div className="admin-modal-overlay" onClick={closeModal}>
        <section className="admin-cashier-modal" onClick={(event) => event.stopPropagation()}>
          <button className="admin-modal-close" type="button" onClick={closeModal}>×</button>
          <p className="admin-eyebrow">{editingId ? 'Edit cashier' : 'New cashier'}</p><h2>{editingId ? 'Cập nhật thu ngân' : 'Tạo tài khoản thu ngân'}</h2>
          <form onSubmit={handleSubmit}>
            <label>HỌ VÀ TÊN<input name="name" value={form.name} onChange={handleChange} placeholder="Ví dụ: Nguyễn Minh Anh" /></label>
            <label>EMAIL<input name="email" type="email" value={form.email} onChange={handleChange} placeholder="cashier@blossombrew.vn" /></label>
            <label>SỐ ĐIỆN THOẠI<input name="phone" value={form.phone} onChange={handleChange} placeholder="0901 234 567" /></label>
            <label>MẬT KHẨU {editingId && <small>Để trống nếu không đổi</small>}<input name="password" type="password" value={form.password} onChange={handleChange} placeholder={editingId ? 'Không thay đổi mật khẩu' : 'Ít nhất 8 ký tự'} /></label>
            {editingId && <label className="admin-checkbox-label"><input name="active" type="checkbox" checked={form.active} onChange={handleChange} />Tài khoản đang hoạt động</label>}
            {message && <p className="admin-form-message">{message}</p>}
            <div className="admin-cashier-modal-actions"><button className="admin-cancel-button" type="button" onClick={closeModal}>Hủy</button><button className="admin-primary-button" type="submit">{editingId ? 'Lưu thay đổi' : 'Tạo tài khoản'}</button></div>
          </form>
        </section>
      </div>}
    </div>
  )
}

export default AdminCashiersPage
