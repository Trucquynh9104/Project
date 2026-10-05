import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import CashierShell from '../../components/CashierShell'
import DateRangeFilter from '../../components/DateRangeFilter'
import { getCurrentUser } from '../../services/authService'
import {
  getNotificationDate,
  getNotificationTime,
  getNotificationsForUser,
  initializeNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from '../../services/notificationService'
import { isInDateRange } from '../../utils/dateRange'

const ITEMS_PER_PAGE = 8

function ListFooter({ currentPage, onPageChange, totalItems, totalPages }) {
  return (
    <div className="cashier-list-footer">
      <span>Tổng số thông báo <b>{totalItems}</b></span>
      <div>
        <button aria-label="Trang trước" disabled={currentPage === 1} type="button" onClick={() => onPageChange(Math.max(1, currentPage - 1))}>‹</button>
        <span>Trang {currentPage}/{totalPages}</span>
        <button aria-label="Trang sau" disabled={currentPage === totalPages} type="button" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}>›</button>
      </div>
    </div>
  )
}

function CashierNoticesPage() {
  const navigate = useNavigate()
  const user = getCurrentUser()
  const notificationUserId = user?.id || ''
  const notificationUserRole = user?.role || ''
  const [notices, setNotices] = useState(() => getNotificationsForUser(user))
  const [currentPage, setCurrentPage] = useState(1)
  const [markAllMessage, setMarkAllMessage] = useState('')

  useEffect(() => {
    function refreshNotices() {
      initializeNotifications()
      setNotices(getNotificationsForUser(notificationUserId ? { id: notificationUserId, role: notificationUserRole } : null))
    }

    refreshNotices()
    return subscribeNotifications(refreshNotices)
  }, [notificationUserId, notificationUserRole])

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const filteredNotices = useMemo(
    () => notices.filter((notice) => isInDateRange(notice.createdAt, fromDate, toDate)),
    [notices, fromDate, toDate],
  )
  const totalPages = Math.max(1, Math.ceil(filteredNotices.length / ITEMS_PER_PAGE))
  const activePage = Math.min(currentPage, totalPages)
  const paginatedNotices = filteredNotices.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE)

  if (!user || user.role !== 'cashier') {
    return <Navigate to="/login" replace />
  }

  function openNotice(notice) {
    markNotificationRead(user, notice.id)
    navigate(notice.to || '/cashier/orders')
  }

  function handleMarkAllRead() {
    const hasUnreadNotices = notices.some((notice) => !notice.read)
    setNotices(markAllNotificationsRead(user))
    setMarkAllMessage(
      hasUnreadNotices
        ? 'Đã đánh dấu tất cả thông báo là đã đọc.'
        : 'Tất cả thông báo đã được đọc.',
    )
  }

  return (
    <CashierShell className="cashier-notices-page" active="notices" topbarTitle="Thông báo" user={user}>
      <section className="cashier-content cashier-list-content cashier-notices-content">
        <div className="cashier-notices-toolbar">
          <button
            className="cashier-outline-button"
            type="button"
            onClick={handleMarkAllRead}
          >
            Đánh dấu tất cả đã đọc
          </button>
          <DateRangeFilter
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={(value) => {
              setFromDate(value)
              setCurrentPage(1)
            }}
            onToDateChange={(value) => {
              setToDate(value)
              setCurrentPage(1)
            }}
          />
        </div>
        {markAllMessage && <p aria-live="polite" className="cashier-notices-message">{markAllMessage}</p>}

        <section className="cashier-notice-list">
          {paginatedNotices.map((notice, index) => (
            <button
              className={notice.read ? 'cashier-notice-item' : 'cashier-notice-item unread'}
              key={notice.id}
              type="button"
              onClick={() => openNotice(notice)}
            >
              <span className="cashier-notice-number">{String((activePage - 1) * ITEMS_PER_PAGE + index + 1).padStart(2, '0')}</span>
              <span className="cashier-notice-copy"><strong>{notice.title}</strong><small>{notice.content}</small></span>
              <span className="cashier-notice-time"><b>{getNotificationTime(notice)}</b><small>{getNotificationDate(notice)}</small></span>
              {!notice.read && <i aria-label="Chưa đọc" className="cashier-notice-unread-dot" />}
            </button>
          ))}
          {!filteredNotices.length && <p className="cashier-orders-empty">Chưa có thông báo nào trong khoảng ngày đã chọn.</p>}
          <ListFooter currentPage={activePage} totalItems={filteredNotices.length} totalPages={totalPages} onPageChange={setCurrentPage} />
        </section>
      </section>
    </CashierShell>
  )
}

export default CashierNoticesPage
