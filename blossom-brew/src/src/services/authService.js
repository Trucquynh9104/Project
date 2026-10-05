const USERS_KEY = 'blossom-brew-users'
const CURRENT_USER_KEY = 'blossom-brew-current-user'
const LOYALTY_MEMBERS_KEY = 'blossom-brew-loyalty-members'
const PERSONAL_VOUCHERS_KEY = 'blossom-personal-vouchers'

export const SILVER_MIN_POINTS = 50
export const GOLD_MIN_POINTS = 101

export function getMembershipTier(points) {
  const totalPoints = Number(points || 0)

  if (totalPoints >= GOLD_MIN_POINTS) return 'Gold'
  if (totalPoints >= SILVER_MIN_POINTS) return 'Silver'
  return 'Member'
}

export function getMembershipLabel(points) {
  return `${getMembershipTier(points)} member`
}

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
}

function getLoyaltyMembersFromStorage() {
  return JSON.parse(
    localStorage.getItem(LOYALTY_MEMBERS_KEY) || '[]',
  )
}

function ensureDemoAccounts() {
  const users = getUsers()

  const demoAccounts = [
    {
      id: 'demo-cashier',
      name: 'Linh Trần',
      email: 'cashier@blossombrew.vn',
      password: 'Cashier123',
      role: 'cashier',
      points: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'demo-admin',
      name: 'Quản trị viên',
      email: 'admin@blossombrew.vn',
      password: 'Admin123',
      role: 'admin',
      points: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ]

  const existingEmails = new Set(users.map((user) => user.email))

  const updatedUsers = [
    ...users,
    ...demoAccounts.filter((user) => !existingEmails.has(user.email)),
  ]

  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers))
}

function saveCurrentUser(user) {
  const sessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    points: user.points || 0,
    avatar: user.avatar || '',
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser))
  return sessionUser
}

export function getLoyaltyMembers() {
  const accountMembers = getUsers()
    .filter((user) => user.role === 'customer' && user.phone)
    .map(({ id, name, email, phone, points = 0 }) => ({
      id,
      name,
      email,
      phone,
      points,
      memberType: 'account',
    }))

  const phonesInAccounts = new Set(
    accountMembers.map((member) => member.phone.replace(/\D/g, '')),
  )

  const counterMembers = getLoyaltyMembersFromStorage().filter(
    (member) => !phonesInAccounts.has(member.phone.replace(/\D/g, '')),
  )

  return [...accountMembers, ...counterMembers]
}

export function addLoyaltyMember({ name, phone }) {
  const normalizedName = name.trim()
  const normalizedPhone = phone.replace(/\D/g, '')

  if (!normalizedName) {
    return { ok: false, message: 'Vui lòng nhập tên thành viên.' }
  }

  if (normalizedPhone.length < 9 || normalizedPhone.length > 11) {
    return { ok: false, message: 'Số điện thoại chưa hợp lệ.' }
  }

  const existingMember = getLoyaltyMembers().find(
    (member) => member.phone.replace(/\D/g, '') === normalizedPhone,
  )

  if (existingMember) {
    return {
      ok: false,
      message: 'Số điện thoại này đã là thành viên.',
    }
  }

  const member = {
    id: `loyalty-${Date.now()}`,
    name: normalizedName,
    phone: normalizedPhone,
    points: 0,
    memberType: 'loyalty',
    createdAt: new Date().toISOString(),
  }

  localStorage.setItem(
    LOYALTY_MEMBERS_KEY,
    JSON.stringify([...getLoyaltyMembersFromStorage(), member]),
  )

  return { ok: true, member }
}

export function getCustomerMembers() {
  return getUsers()
    .filter((user) => user.role === 'customer' && user.phone)
    .map(({ id, name, email, phone, points = 0 }) => ({
      id,
      name,
      email,
      phone,
      points,
    }))
}

export function registerUser({ name, email, password }) {
  const users = getUsers()
  const normalizedEmail = email.trim().toLowerCase()

  const alreadyExists = users.some(
    (user) => user.email === normalizedEmail,
  )

  if (alreadyExists) {
    return {
      ok: false,
      message: 'Email này đã được đăng ký.',
    }
  }

  const user = {
    id: String(Date.now()),
    name: name.trim(),
    email: normalizedEmail,
    password,
    phone: '',
    role: 'customer',
    points: 0,
    avatar: '',
    createdAt: new Date().toISOString(),
  }

  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]))
  saveCurrentUser(user)

  return { ok: true, user }
}

export function loginUser({ email, password }) {
  ensureDemoAccounts()

  const normalizedEmail = email.trim().toLowerCase()

  const user = getUsers().find(
    (item) =>
      item.email === normalizedEmail && item.password === password,
  )

  if (!user) {
    return {
      ok: false,
      message: 'Email hoặc mật khẩu chưa đúng.',
    }
  }
if (user.role === 'cashier' && user.active === false) {
  return {
    ok: false,
    message: 'Tài khoản thu ngân đang tạm ngưng. Vui lòng liên hệ quản trị viên.',
  }
}
  return {
    ok: true,
    user: saveCurrentUser(user),
  }
}

export function getCurrentUser() {
  return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null')
}

export function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export function updateUserProfile({ name, phone, avatar, password = '' }) {
  const currentUser = getCurrentUser()

  if (!currentUser) {
    return { ok: false, message: 'Bạn chưa đăng nhập.' }
  }

  const updatedUsers = getUsers().map((user) =>
    user.id === currentUser.id
      ? {
          ...user,
          name: name.trim(),
          phone: phone.trim(),
          avatar: avatar || '',
          ...(password.trim() ? { password: password.trim() } : {}),
        }
      : user,
  )

  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers))

  const updatedCurrentUser = {
    ...currentUser,
    name: name.trim(),
    phone: phone.trim(),
    avatar: avatar || '',
  }

  localStorage.setItem(
    CURRENT_USER_KEY,
    JSON.stringify(updatedCurrentUser),
  )

  return { ok: true, user: updatedCurrentUser }
}

ensureDemoAccounts()

export function updateMemberPoints({ id, memberType, points }) {
  const newPoints = Math.max(0, Number(points) || 0)

  if (memberType === 'account') {
    const updatedUsers = getUsers().map((user) =>
      user.id === id
        ? { ...user, points: newPoints }
        : user,
    )

    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers))

    const currentUser = getCurrentUser()

    if (currentUser?.id === id) {
      localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify({
          ...currentUser,
          points: newPoints,
        }),
      )
    }

    return { ok: true }
  }

  const updatedMembers = getLoyaltyMembersFromStorage().map((member) =>
    member.id === id
      ? { ...member, points: newPoints }
      : member,
  )

  localStorage.setItem(
    LOYALTY_MEMBERS_KEY,
    JSON.stringify(updatedMembers),
  )

  return { ok: true }
}
export function addMemberPoints({ id, memberType, points }) {
  const pointsToAdd = Number(points) || 0

  if (!id || pointsToAdd <= 0) {
    return { ok: false }
  }

  if (memberType === 'account') {
    let updatedMember = null

    const updatedUsers = getUsers().map((user) => {
      if (user.id !== id) return user

      updatedMember = {
        ...user,
        points: (Number(user.points) || 0) + pointsToAdd,
      }

      return updatedMember
    })

    if (!updatedMember) {
      return { ok: false }
    }

    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers))

    const currentUser = getCurrentUser()

    if (currentUser?.id === id) {
      localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify({
          ...currentUser,
          points: updatedMember.points,
        }),
      )
    }

    return { ok: true, member: updatedMember }
  }

  let updatedMember = null

  const updatedMembers = getLoyaltyMembersFromStorage().map((member) => {
    if (member.id !== id) return member

    updatedMember = {
      ...member,
      points: (Number(member.points) || 0) + pointsToAdd,
    }

    return updatedMember
  })

  if (!updatedMember) {
    return { ok: false }
  }

  localStorage.setItem(
    LOYALTY_MEMBERS_KEY,
    JSON.stringify(updatedMembers),
  )

  return { ok: true, member: updatedMember }
}
export function getPersonalVouchers(userId) {
  try {
    const vouchers = JSON.parse(
      localStorage.getItem(PERSONAL_VOUCHERS_KEY) || '[]',
    )

    return vouchers.filter((voucher) => {
      const isExpired =
        voucher.expiry &&
        new Date(voucher.expiry).getTime() < Date.now()

      return voucher.userId === userId && !voucher.used && !isExpired
    })
  } catch {
    return []
  }
}

export function redeemPointsVoucher({ pointsToRedeem }) {
  const currentUser = getCurrentUser()
  const points = Number(pointsToRedeem)

  if (!currentUser || currentUser.role !== 'customer') {
    return { ok: false, message: 'Bạn cần đăng nhập tài khoản khách hàng.' }
  }

  if (!Number.isInteger(points) || points < 10) {
    return { ok: false, message: 'Vui lòng đổi tối thiểu 10 điểm.' }
  }

  if (points > Number(currentUser.points || 0)) {
    return {
      ok: false,
      message: 'Số điểm muốn đổi lớn hơn điểm hiện có.',
    }
  }

  const discount = points * 1000
  const code = `POINTS${Date.now().toString().slice(-6)}`

  const updatedUser = {
    ...currentUser,
    points: Number(currentUser.points || 0) - points,
  }

  const updatedUsers = getUsers().map((user) =>
    user.id === currentUser.id
      ? { ...user, points: updatedUser.points }
      : user,
  )

  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers))
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser))

  const personalVouchers = JSON.parse(
    localStorage.getItem(PERSONAL_VOUCHERS_KEY) || '[]',
  )

  const voucher = {
    id: `voucher-${Date.now()}`,
    userId: currentUser.id,
    code,
    discount,
    minOrder: 0,
    createdAt: new Date().toISOString(),
    expiry: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    usedAt: '',
  }

  localStorage.setItem(
    PERSONAL_VOUCHERS_KEY,
    JSON.stringify([...personalVouchers, voucher]),
  )

  return {
    ok: true,
    user: updatedUser,
    voucher,
    message: `Đã đổi ${points} điểm lấy voucher giảm ${discount.toLocaleString('vi-VN')}đ.`,
  }
}

export function consumePersonalVoucher({ userId, code }) {
  const vouchers = JSON.parse(
    localStorage.getItem(PERSONAL_VOUCHERS_KEY) || '[]',
  )

  const updatedVouchers = vouchers.map((voucher) =>
    voucher.userId === userId && voucher.code === code
      ? { ...voucher, used: true, usedAt: new Date().toISOString() }
      : voucher,
  )

  localStorage.setItem(
    PERSONAL_VOUCHERS_KEY,
    JSON.stringify(updatedVouchers),
  )
}
export function resetUserPassword({ email, newPassword }) {
  const normalizedEmail = email.trim().toLowerCase()

  if (newPassword.length < 8) {
    return {
      ok: false,
      message: 'Mật khẩu cần có ít nhất 8 ký tự.',
    }
  }

  let updated = false

  const updatedUsers = getUsers().map((user) => {
    if (user.email !== normalizedEmail) {
      return user
    }

    updated = true

    return {
      ...user,
      password: newPassword,
    }
  })

  if (!updated) {
    return {
      ok: false,
      message: 'Không tìm thấy tài khoản với email này.',
    }
  }

  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers))

  return {
    ok: true,
    message: 'Đặt lại mật khẩu thành công.',
  }
}
