import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getCurrentUser, logoutUser } from '../../services/authService'

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem('blossom-orders') || '[]')
  } catch {
    return []
  }
}

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`
}

function getDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isInRange(value, range) {
  if (range === 'all') return true
  const date = getDate(value)
  if (!date) return false

  const now = new Date()
  const limit = new Date()
  limit.setHours(0, 0, 0, 0)
  limit.setDate(limit.getDate() - (range === '7days' ? 6 : 29))

  return date <= now && date >= limit
}

function getPaymentLabel(value) {
  if (value === 'cash') return 'Tiền mặt'
  if (value === 'card') return 'Thẻ'
  return 'QR'
}

function AdminReportsPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const [range, setRange] = useState('7days')
  const [orders] = useState(getOrders)

  const report = useMemo(() => {
    const completedOrders = orders.filter(
      (order) =>
        order.status === 'Hoàn tất' &&
        isInRange(order.createdAt, range),
    )

    const revenue = completedOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    )

    const products = {}
    const payments = { QR: 0, 'Tiền mặt': 0, Thẻ: 0 }

    completedOrders.forEach((order) => {
      payments[getPaymentLabel(order.paymentMethod)] += Number(order.total || 0)
      ;(order.items || []).forEach((item) => {
        const name = item.name || 'Món chưa xác định'
        products[name] = (products[name] || 0) + Number(item.quantity || 0)
      })
    })

    const dailyRevenue = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - index))
      const total = completedOrders
        .filter((order) => {
          const orderDate = getDate(order.createdAt)
          return orderDate && orderDate.toDateString() === date.toDateString()
        })
        .reduce((sum, order) => sum + Number(order.total || 0), 0)

      return {
        label: new Intl.DateTimeFormat('vi-VN', { weekday: 'short' })
          .format(date)
          .replace('Thứ ', 'T'),
        value: total,
      }
    })

    return {
      revenue,
      orders: completedOrders,
      average: completedOrders.length ? revenue / completedOrders.length : 0,
      products: Object.entries(products)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((first, second) => second.quantity - first.quantity)
        .slice(0, 5),
      payments: Object.entries(payments).map(([name, value]) => ({ name, value })),
      dailyRevenue,
    }
  }, [orders, range])

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  const chartMax = Math.max(
    ...report.dailyRevenue.map((day) => day.value),
    1,
  )
  const paymentTotal = Math.max(report.revenue, 1)
  const productMax = Math.max(
    ...report.products.map((product) => product.quantity),
    1,
  )

  const navItems = [
    { icon: '⌂', label: 'Tổng quan', to: '/admin' },
    { icon: '⌁', label: 'Quản lý menu', to: '/admin/products' },
    { icon: '□', label: 'Đơn hàng', to: '/admin/orders' },
    { icon: '◦', label: 'Thành viên', to: '/admin/members' },
    { icon: '◇', label: 'Voucher', to: '/admin/vouchers' },
    { icon: '♙', label: 'Tài khoản thu ngân', to: '/admin/cashiers' },
    { icon: '↗', label: 'Báo cáo', to: '/admin/reports', active: true },
    { icon: '✦', label: 'Thông báo', to: '/admin/notices' },
    { icon: '○', label: 'Thông tin cá nhân', to: '/admin/profile' },
  ]

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  function exportReport() {
    const rows = [
      ['Chỉ số', 'Giá trị'],
      ['Doanh thu', report.revenue],
      ['Đơn hoàn tất', report.orders.length],
      ['Giá trị đơn trung bình', Math.round(report.average)],
      [],
      ['Món bán chạy', 'Số lượng'],
      ...report.products.map((product) => [product.name, product.quantity]),
    ]
    const csv = rows
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const url = URL.createObjectURL(
      new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'bao-cao-blossom-brew.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-dashboard admin-reports-page">
      <aside className="admin-sidebar">
        <button className="admin-brand" type="button" onClick={() => navigate('/admin')}><span>B</span>Blossom Brew</button>
        <p className="admin-sidebar-label">Admin workspace</p>
        <nav className="admin-nav">
          {navItems.map((item) => <button className={item.active ? 'admin-nav-item active' : 'admin-nav-item'} key={item.label} type="button" onClick={() => navigate(item.to)}><span>{item.icon}</span>{item.label}</button>)}
        </nav>
        <div className="admin-profile"><span className="admin-avatar">{initials}</span><div><strong>{user.name}</strong><small>Administrator</small></div><button type="button" onClick={handleLogout}>Đăng xuất</button></div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar"><span>BÁO CÁO</span><span>Phân tích hiệu quả kinh doanh</span></header>
        <section className="admin-content">
          <div className="admin-reports-heading">
            <div><p className="admin-eyebrow">Business report</p><h1>Báo cáo bán hàng.</h1><p>Dữ liệu được tính từ các đơn đã hoàn tất.</p></div>
            <div className="admin-report-actions"><select value={range} onChange={(event) => setRange(event.target.value)}><option value="7days">7 ngày gần đây</option><option value="30days">30 ngày gần đây</option><option value="all">Toàn bộ thời gian</option></select><button className="admin-export-button" type="button" onClick={exportReport}>Xuất CSV</button></div>
          </div>

          <section className="admin-report-kpis">
            <article><span>Doanh thu</span><strong>{formatPrice(report.revenue)}</strong><small>Đơn hoàn tất trong kỳ</small></article>
            <article><span>Đơn hoàn tất</span><strong>{report.orders.length.toString().padStart(2, '0')}</strong><small>Đã thanh toán thành công</small></article>
            <article><span>Giá trị đơn trung bình</span><strong>{formatPrice(report.average)}</strong><small>Trên mỗi đơn hoàn tất</small></article>
          </section>

          <section className="admin-report-grid">
            <article className="admin-report-card admin-revenue-chart-card">
              <div><p className="admin-eyebrow">Revenue trend</p><h2>Doanh thu 7 ngày gần đây.</h2></div>
              <div className="admin-revenue-bars">
                {report.dailyRevenue.map((day) => <div className="admin-revenue-bar" key={day.label}><span title={formatPrice(day.value)} style={{ height: `${Math.max((day.value / chartMax) * 100, day.value ? 7 : 0)}%` }} /><small>{day.label}</small></div>)}
              </div>
            </article>

            <article className="admin-report-card">
              <p className="admin-eyebrow">Payment methods</p><h2>Phương thức thanh toán.</h2>
              <div className="admin-payment-list">
                {report.payments.map((payment) => <div key={payment.name}><span>{payment.name}</span><i><b style={{ width: `${(payment.value / paymentTotal) * 100}%` }} /></i><strong>{formatPrice(payment.value)}</strong></div>)}
              </div>
            </article>

            <article className="admin-report-card admin-best-sellers-card">
              <p className="admin-eyebrow">Best sellers</p><h2>Món bán chạy.</h2>
              <div className="admin-best-sellers-list">
                {report.products.map((product, index) => <div key={product.name}><span>{String(index + 1).padStart(2, '0')}</span><p>{product.name}<i><b style={{ width: `${(product.quantity / productMax) * 100}%` }} /></i></p><strong>{product.quantity} ly</strong></div>)}
                {!report.products.length && <p className="admin-empty">Chưa có dữ liệu món bán.</p>}
              </div>
            </article>
          </section>
        </section>
      </main>
    </div>
  )
}

export default AdminReportsPage
