import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const initialNotices = [
  {
    id: 1,
    title: 'Đơn hàng mới đã được tiếp nhận',
    description: 'Cửa hàng đang chuẩn bị món cho bạn.',
    time: 'Vừa xong',
    read: false,
  },
  {
    id: 2,
    title: 'Voucher BBSILVER sẵn sàng sử dụng',
    description: 'Giảm 20%, tối đa 30.000đ cho đơn từ 80.000đ.',
    time: '09:00',
    read: false,
  },
  {
    id: 3,
    title: 'Bạn vừa nhận 52 điểm',
    description: 'Điểm tích luỹ đã được cộng vào tài khoản.',
    time: '24/09',
    read: true,
  },
  {
    id: 4,
    title: 'Cold Brew Cam đã trở lại',
    description: 'Món uống yêu thích đã có trong menu theo mùa.',
    time: '22/09',
    read: true,
  },
  {
    id: 5,
    title: 'Chào mừng bạn đến với Blossom Brew',
    description: 'Khám phá ưu đãi dành riêng cho thành viên mới.',
    time: '20/09',
    read: true,
  },
]

function NotificationDropdown() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notices, setNotices] = useState(initialNotices)

  const unreadCount = notices.filter((notice) => !notice.read).length

  function markRead(id) {
    setNotices((current) =>
      current.map((notice) =>
        notice.id === id ? { ...notice, read: true } : notice,
      ),
    )
  }

  function viewAll() {
    setIsOpen(false)
    navigate('/customer/notices')
  }

  return (
    <div className="bb-notification-dropdown">
      <button
        className="bb-notification-trigger"
        onClick={() => setIsOpen(!isOpen)}
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
            {notices.map((notice) => (
              <button
                className={
                  notice.read
                    ? 'bb-notification-preview'
                    : 'bb-notification-preview unread'
                }
                key={notice.id}
                onClick={() => markRead(notice.id)}
                type="button"
              >
                {!notice.read && <i className="bb-notification-item-dot" />}

                <span>
                  <strong>{notice.title}</strong>
                  <small>{notice.description}</small>
                </span>

                <time>{notice.time}</time>
              </button>
            ))}
          </div>

          <button
            className="bb-view-all-notices"
            onClick={viewAll}
            type="button"
          >
            Xem tất cả thông báo →
          </button>
        </section>
      )}
    </div>
  )
}

export default NotificationDropdown