const VOUCHERS_KEY = 'blossom-vouchers'

const defaultVouchers = [
  {
    id: 'voucher-1',
    code: 'BBSILVER',
    type: 'percent',
    value: 20,
    minOrder: 80000,
    maxDiscount: 30000,
    requiresSilver: true,
    active: true,
  },
  {
    id: 'voucher-2',
    code: 'WELCOME25',
    type: 'fixed',
    value: 25000,
    minOrder: 60000,
    maxDiscount: 0,
    active: true,
  },
]

function getVouchers() {
  const savedVouchers = localStorage.getItem(VOUCHERS_KEY)

  if (!savedVouchers) {
    localStorage.setItem(VOUCHERS_KEY, JSON.stringify(defaultVouchers))
    return defaultVouchers
  }

  return JSON.parse(savedVouchers)
}

export function applyVoucher(code, subtotal, member) {
  const normalizedCode = code.trim().toUpperCase()

  const voucher = getVouchers().find(
    (item) => item.code === normalizedCode && item.active,
  )

  if (!voucher) {
    return {
      ok: false,
      message: 'Voucher không hợp lệ hoặc đã tắt.',
    }
  }

  if (subtotal < voucher.minOrder) {
    return {
      ok: false,
      message: `Đơn tối thiểu ${voucher.minOrder.toLocaleString('vi-VN')}đ để dùng voucher này.`,
    }
  }

  if (
    voucher.requiresSilver &&
    (!member || Number(member.points) < 500)
  ) {
    return {
      ok: false,
      message: 'Voucher BBSILVER chỉ áp dụng cho thành viên Silver.',
    }
  }

  let discount = 0

  if (voucher.type === 'percent') {
    discount = (subtotal * voucher.value) / 100

    if (voucher.maxDiscount > 0) {
      discount = Math.min(discount, voucher.maxDiscount)
    }
  } else {
    discount = voucher.value
  }

  discount = Math.min(discount, subtotal)

  return {
    ok: true,
    voucher,
    discount,
    message: `Áp dụng voucher ${voucher.code} thành công.`,
  }
}