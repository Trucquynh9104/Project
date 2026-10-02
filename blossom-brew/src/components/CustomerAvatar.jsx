import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'

function CustomerAvatar() {
  const navigate = useNavigate()
  const user = getCurrentUser()

  if (!user) return null

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(-2)
    .join('')
    .toUpperCase()

  return (
    <button
      className="bb-header-avatar"
      onClick={() => navigate('/customer/profile')}
      title="Thông tin cá nhân"
      type="button"
    >
      {user.avatar ? (
        <img src={user.avatar} alt={user.name} />
      ) : (
        initials
      )}
    </button>
  )
}

export default CustomerAvatar