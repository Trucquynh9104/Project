import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'
import {
  getNotificationLabel,
  getNotificationsForUser,
  initializeNotifications,
  markNotificationRead,
  subscribeNotifications,
} from '../services/notificationService'

function getNoticesRoute(role) {
  if (role === 'cashier') return '/cashier/notices'
  if (role === 'admin') return '/admin/notices'
  return '/customer/notices'
}

function NotificationDropdown() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const notificationUserId = user?.id || ''
  const notificationUserRole = user?.role || ''
  const [isOpen, setIsOpen] = useState(false)
  const [notices, setNotices] = useState(() => getNotificationsForUser(user))

  useEffect(() => {
    function refreshNotices() {
      initializeNotifications()
      setNotices(getNotificationsForUser(notificationUserId ? { id: notificationUserId, role: notificationUserRole } : null))
    }

    refreshNotices()
    return subscribeNotifications(refreshNotices)
  }, [notificationUserId, notificationUserRole])

  if (!user) return null

  const unreadCount = notices.filter((notice) => !notice.read).length

  function openNotice(notice) {
    markNotificationRead(user, notice.id)
    setIsOpen(false)
    navigate(notice.to || getNoticesRoute(user.role))
  }

  function viewAll() {
    setIsOpen(false)
    navigate(getNoticesRoute(user.role))
  }

  return (
    <div className="bb-notification-dropdown">
      <button
        aria-label="Mở thông báo"
        className="bb-notification-trigger"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>🔔</span>
        {unreadCount > 0 && <i className="bb-notification-badge" />}
      </button>

      {isOpen && (
        <section className="bb-notification-panel">
          <div className="bb-notification-panel-header">
            <strong>Thông báo</strong>
            <span>{unreadCount} chưa đọc</span>
          </div>

          <div className="bb-notification-preview-list">
            {notices.slice(0, 5).map((notice) => (
              <button
                className={notice.read ? 'bb-notification-preview' : 'bb-notification-preview unread'}
                key={notice.id}
                onClick={() => openNotice(notice)}
                type="button"
              >
                {!notice.read && <i className="bb-notification-item-dot" />}
                <span>
                  <strong>{notice.title}</strong>
                  <small>{notice.content}</small>
                </span>
                <time>{getNotificationLabel(notice)}</time>
              </button>
            ))}
            {!notices.length && <p className="bb-notification-empty">Chưa có thông báo mới.</p>}
          </div>

          <button className="bb-view-all-notices" onClick={viewAll} type="button">
            Xem tất cả thông báo →
          </button>
        </section>
      )}
    </div>
  )
}

export default NotificationDropdown
