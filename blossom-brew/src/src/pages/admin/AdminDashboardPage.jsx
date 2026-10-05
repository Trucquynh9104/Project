import { useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  getCurrentUser,
  getLoyaltyMembers,
  logoutUser,
} from '../../services/authService'

function getStorageList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString('vi-VN')}đ`
}

function getDayRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return { start, end }
}

function isInRange(value, range) {
  const time = new Date(value).getTime()
  return Number.isFinite(time) && time >= range.start.getTime() && time < range.end.getTime()
}

function getChangeText(current, previous, suffix = '') {
  if (!previous) {
    return current ? `↑ Mới hôm nay${suffix}` : '— Không thay đổi'
  }

  const percent = Math.round(((current - previous) / previous) * 100)
  const symbol = percent >= 0 ? '↑' : '↓'

  return `${symbol} ${Math.abs(percent)}% so với hôm qua${suffix}`
}

function AdminDashboardPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()

  const dashboard = useMemo(() => {
    const now = new Date()
    const today = getDayRange(now)
    const yesterdayDate = new Date(today.start)
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = getDayRange(yesterdayDate)

    const orders = getStorageList('blossom-orders')
    const members = getLoyaltyMembers()
    const completedOrders = orders.filter((order) => order.status === 'Hoàn tất')
    const ordersToday = orders.filter((order) => isInRange(order.createdAt, today))
    const ordersYesterday = orders.filter((order) => isInRange(order.createdAt, yesterday))
    const completedToday = completedOrders.filter((order) => isInRange(order.createdAt, today))
    const completedYesterday = completedOrders.filter((order) => isInRange(order.createdAt, yesterday))
    const membersToday = members.filter((member) => isInRange(member.createdAt, today))
    const membersYesterday = members.filter((member) => isInRange(member.createdAt, yesterday))
    const vouchersToday = ordersToday.filter((order) => order.voucherCode)
    const vouchersYesterday = ordersYesterday.filter((order) => order.voucherCode)

    const revenueToday = completedToday.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    )
    const revenueYesterday = completedYesterday.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    )

    const salesByHour = Array.from({ length: 13 }, (_, index) => {
      const hour = index + 8
      const value = completedToday
        .filter((order) => new Date(order.createdAt).getHours() === hour)
        .reduce((sum, order) => sum + Number(order.total || 0), 0)

      return { hour, value }
    })
    const maxHourlyRevenue = Math.max(...salesByHour.map((item) => item.value), 1)

    const productStats = new Map()
    completedToday.forEach((order) => {
      ;(order.items || []).forEach((item) => {
        const oldValue = productStats.get(item.name) || { quantity: 0, revenue: 0 }
        productStats.set(item.name, {
          quantity: oldValue.quantity + Number(item.quantity || 0),
          revenue: oldValue.revenue + Number(item.price || 0) * Number(item.quantity || 0),
        })
      })
    })

    const favorites = [...productStats.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((first, second) => second.quantity - first.quantity)
      .slice(0, 3)

    return {
      now,
      revenueToday,
      revenueYesterday,
      ordersToday,
      ordersYesterday,
      membersToday,
      membersYesterday,
      vouchersToday,
      vouchersYesterday,
      salesByHour,
      maxHourlyRevenue,
      favorites,
    }
  }, [])

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  const dateLabel = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(dashboard.now)

  function handleLogout() {
    logoutUser()
    navigate('/')
  }

  const navItems = [
    { icon: '⌂', label: 'Tổng quan', to: '/admin', active: true },
    { icon: '⌁', label: 'Quản lý menu', to: '/admin/products' },
    { icon: '□', label: 'Đơn hàng', to: '/admin/orders' },
    { icon: '◦', label: 'Thành viên', to: '/admin/members' },
    { icon: '◇', label: 'Voucher', to: '/admin/vouchers' },
    { icon: '♙', label: 'Tài khoản thu ngân', to: '/admin/cashiers' },
    { icon: '↗', label: 'Báo cáo', to: '/admin/reports' },
    { icon: '✦', label: 'Thông báo', to: '/admin/notices' },
    { icon: '○', label: 'Thông tin cá nhân', to: '/admin/profile' },
  ]

  const kpis = [
    {
      icon: '↗',
      value: formatPrice(dashboard.revenueToday),
      label: 'Doanh thu hôm nay',
      change: getChangeText(dashboard.revenueToday, dashboard.revenueYesterday),
    },
    {
      icon: '□',
      value: dashboard.ordersToday.length,
      label: 'Đơn hàng đã tạo',
      change: getChangeText(dashboard.ordersToday.length, dashboard.ordersYesterday.length),
    },
    {
      icon: '○',
      value: dashboard.membersToday.length,
      label: 'Thành viên mới',
      change: getChangeText(dashboard.membersToday.length, dashboard.membersYesterday.length, ' người'),
    },
    {
      icon: '◇',
      value: dashboard.vouchersToday.length,
      label: 'Voucher đã sử dụng',
      change: getChangeText(dashboard.vouchersToday.length, dashboard.vouchersYesterday.length),
    },
  ]

  return (
    <div className="admin-dashboard admin-figma-dashboard">
      <aside className="admin-sidebar">
        <button className="admin-brand" type="button" onClick={() => navigate('/admin')}>
          <span>B</span>
          Blossom Brew
        </button>

        <p className="admin-sidebar-label">Admin workspace</p>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <button
              className={item.active ? 'admin-nav-item active' : 'admin-nav-item'}
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
          <button type="button" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <span>TỔNG QUAN</span>
          <span>{dateLabel}　✦</span>
        </header>

        <section className="admin-content">
          <div className="admin-figma-heading">
            <div>
              <p className="admin-eyebrow">Store overview</p>
              <h1>Nhịp vận hành hôm nay.</h1>
              <p className="admin-lead">Tổng quan nhanh để bạn nắm tình hình kinh doanh của Blossom Brew.</p>
            </div>
            <span className="admin-date-chip">Hôm nay · {dateLabel}</span>
          </div>

          <section className="admin-kpi-grid admin-figma-kpis">
            {kpis.map((kpi) => (
              <article key={kpi.label}>
                <span className="admin-kpi-icon">{kpi.icon}</span>
                <strong>{kpi.value}</strong>
                <span>{kpi.label}</span>
                <small className={kpi.change.startsWith('↓') ? 'negative' : ''}>{kpi.change}</small>
              </article>
            ))}
          </section>

          <section className="admin-overview-panels">
            <article className="admin-revenue-chart-card">
              <div className="admin-panel-title">
                <div>
                  <h2>Doanh thu theo giờ</h2>
                  <small>Hôm nay · VNĐ</small>
                </div>
                <small>08:00 — 20:00</small>
              </div>
              <div className="admin-hourly-bars">
                {dashboard.salesByHour.map((item) => (
                  <div className="admin-hourly-bar" key={item.hour} title={`${item.hour}:00 · ${formatPrice(item.value)}`}>
                    <i style={{ height: `${Math.max(5, (item.value / dashboard.maxHourlyRevenue) * 100)}%` }} />
                  </div>
                ))}
              </div>
              <div className="admin-hourly-axis"><span>08:00</span><span>14:00</span><span>20:00</span></div>
            </article>

            <article className="admin-favorite-card">
              <div className="admin-panel-title">
                <div>
                  <h2>Món được yêu thích</h2>
                  <small>Top 3 theo số lượng bán</small>
                </div>
              </div>
              <div className="admin-favorite-list">
                {dashboard.favorites.map((product, index) => (
                  <div key={product.name}>
                    <b>0{index + 1}</b>
                    <span><strong>{product.name}</strong><small>{product.quantity} ly đã bán hôm nay</small></span>
                    <em>{formatPrice(product.revenue)}</em>
                  </div>
                ))}
                {!dashboard.favorites.length && <p className="admin-empty-state">Chưa có đơn hoàn tất hôm nay.</p>}
              </div>
            </article>
          </section>
        </section>
      </main>
    </div>
  )
}

export default AdminDashboardPage
