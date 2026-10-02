import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  getCurrentUser,
  getLoyaltyMembers,
  logoutUser,
  updateMemberPoints,
} from '../../services/authService'

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem('blossom-orders') || '[]')
  } catch {
    return []
  }
}

function getRank(points) {
  if (Number(points || 0) >= 1000) return 'Gold'
  return 'Silver'
}

function getMemberCode(member) {
  return `MB-${String(member.id || '').slice(-6).toUpperCase()}`
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function AdminMembersPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [members, setMembers] = useState(() => getLoyaltyMembers())
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedMember, setSelectedMember] = useState(null)
  const [pointsInput, setPointsInput] = useState('')
  const [message, setMessage] = useState('')

  const orders = useMemo(getOrders, [])

  const memberRows = useMemo(
    () =>
      members.map((member) => {
        const memberOrders = orders.filter(
          (order) =>
            order.member?.id === member.id ||
            (!order.member?.id && order.member?.phone === member.phone),
        )
        const completedOrders = memberOrders.filter(
          (order) => order.status === 'Hoàn tất',
        )

        return {
          ...member,
          orderCount: memberOrders.length,
          completedOrderCount: completedOrders.length,
          totalSpent: completedOrders.reduce(
            (sum, order) => sum + Number(order.total || 0),
            0,
          ),
        }
      }),
    [members, orders],
  )

  const filteredMembers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()

    return memberRows.filter((member) => {
      const matchedKeyword =
        !normalizedKeyword ||
        [member.name, member.phone, member.email, getMemberCode(member)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword)
      const matchedType =
        typeFilter === 'all' || member.memberType === typeFilter

      return matchedKeyword && matchedType
    })
  }, [keyword, memberRows, typeFilter])

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
    { icon: '◦', label: 'Thành viên', to: '/admin/members', active: true },
    { icon: '◇', label: 'Voucher', to: '/admin/vouchers' },
    { icon: '♙', label: 'Tài khoản thu ngân', to: '/admin/cashiers' },
    { icon: '↗', label: 'Báo cáo', to: '/admin/reports' },
    { icon: '✦', label: 'Thông báo', to: '/admin/notices' },
    { icon: '○', label: 'Thông tin cá nhân', to: '/admin/profile' },
  ]

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  function openMember(member) {
    setSelectedMember(member)
    setPointsInput(String(member.points || 0))
    setMessage('')
  }

  function closeMember() {
    setSelectedMember(null)
    setMessage('')
  }

  function savePoints() {
    const result = updateMemberPoints({
      id: selectedMember.id,
      memberType: selectedMember.memberType,
      points: pointsInput,
    })

    if (!result.ok) {
      setMessage('Không thể cập nhật điểm thành viên.')
      return
    }

    setMembers(getLoyaltyMembers())
    closeMember()
  }

  return (
    <div className="admin-dashboard admin-members-page">
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
          {navItems.map((item) => (
            <button
              className={
                item.active ? 'admin-nav-item active' : 'admin-nav-item'
              }
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-profile">
          <span className="admin-avatar">{initials}</span>
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
          <span>THÀNH VIÊN</span>
        </header>

        <section className="admin-content">
          <div className="admin-members-heading">
            <div>
              <p className="admin-eyebrow">Customer relationship</p>
              <h1>Thành viên.</h1>
              <p>Tra cứu lịch sử mua hàng và quản lý điểm thành viên.</p>
            </div>

            <span className="admin-members-count">
              {memberRows.length} thành viên
            </span>
          </div>

          <div className="admin-members-toolbar">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm mã thành viên, tên, số điện thoại..."
            />

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">Tất cả thành viên</option>
              <option value="account">Có tài khoản</option>
              <option value="loyalty">Tích điểm tại quầy</option>
            </select>
          </div>

          <section className="admin-members-table-figma">
            <div className="admin-members-row-figma admin-members-header-figma">
              <span>Thành viên</span>
              <span>Liên hệ</span>
              <span>Hạng</span>
              <span>Điểm</span>
              <span>Đơn hàng</span>
              <span>Thao tác</span>
            </div>

            {filteredMembers.map((member) => (
              <div className="admin-members-row-figma" key={member.id}>
                <span className="admin-member-cell">
                  <strong>{member.name}</strong>
                  <small>{getMemberCode(member)}</small>
                </span>

                <span className="admin-member-cell">
                  <strong>{member.phone}</strong>
                  <small>{member.email || 'Tích điểm tại quầy'}</small>
                </span>

                <span className={`admin-member-rank ${getRank(member.points).toLowerCase()}`}>
                  {getRank(member.points)}
                </span>

                <strong>{Number(member.points || 0).toLocaleString('vi-VN')} điểm</strong>
                <span>{member.orderCount} đơn</span>

                <button
                  className="admin-member-detail"
                  type="button"
                  onClick={() => openMember(member)}
                >
                  Xem hồ sơ
                </button>
              </div>
            ))}

            {!filteredMembers.length && (
              <p className="admin-empty">Không tìm thấy thành viên phù hợp.</p>
            )}
          </section>
        </section>
      </main>

      {selectedMember && (
        <div className="admin-modal-overlay" onClick={closeMember}>
          <section
            className="admin-member-modal-figma"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="admin-modal-close"
              type="button"
              onClick={closeMember}
            >
              ×
            </button>

            <p className="admin-eyebrow">Member profile</p>
            <h2>{selectedMember.name}</h2>
            <p className="admin-member-modal-code">
              {getMemberCode(selectedMember)} · {getRank(selectedMember.points)} member
            </p>

            <div className="admin-member-profile-grid">
              <p><span>Số điện thoại</span><strong>{selectedMember.phone}</strong></p>
              <p><span>Email</span><strong>{selectedMember.email || 'Chưa có tài khoản'}</strong></p>
              <p><span>Đơn đã hoàn tất</span><strong>{selectedMember.completedOrderCount} đơn</strong></p>
              <p><span>Ngày tham gia</span><strong>{formatDate(selectedMember.createdAt)}</strong></p>
            </div>

            <label className="admin-member-points-input">
              ĐIỂM THÀNH VIÊN
              <input
                type="number"
                min="0"
                value={pointsInput}
                onChange={(event) => setPointsInput(event.target.value)}
              />
            </label>

            {message && <p className="admin-form-message">{message}</p>}

            <div className="admin-member-modal-actions">
              <button className="admin-cancel-button" type="button" onClick={closeMember}>Hủy</button>
              <button className="admin-primary-button" type="button" onClick={savePoints}>Lưu điểm</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default AdminMembersPage
