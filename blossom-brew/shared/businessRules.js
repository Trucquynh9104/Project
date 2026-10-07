export const STORE_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const SILVER_MIN_POINTS = 50;
export const GOLD_MIN_POINTS = 101;
export const ORDER_TRANSITIONS = {
  "Chờ xác nhận": ["Chờ pha", "Đã hủy"],
  "Chờ pha": ["Đang pha", "Đã hủy"],
  "Đang pha": ["Hoàn tất", "Đã hủy"],
  "Hoàn tất": [],
  "Đã hủy": [],
};
export const PAYMENT_LABELS = {
  pending: "Chờ thanh toán",
  failed: "Thất bại",
  paid: "Đã thanh toán",
};
export const PAYMENT_METHODS = {
  cash: "Tiền mặt",
  qr: "QR",
  card: "Thẻ",
  wallet: "Ví điện tử",
};
export const voucherCodeValid = (code) => /^[A-Z0-9_-]+$/.test(code);
export const isMoney = (value) =>
  value !== "" &&
  value != null &&
  Number.isSafeInteger(Number(value)) &&
  Number(value) >= 0;
export const localDay = (at = Date.now()) =>
  new Date(Number(at) + 7 * 3600000).toISOString().slice(0, 10);
export function isVoucherExpired(expiry, at = Date.now()) {
  if (!expiry) return false;
  const end = expiry.length === 10 ? expiry + "T23:59:59.999+07:00" : expiry;
  return !Number.isFinite(Date.parse(end)) || Date.parse(end) < at;
}
export function evaluateVoucher(voucher, subtotal, member, at = Date.now()) {
  const invalid = (message) => ({ ok: false, discount: 0, message });
  if (!voucher || voucher.used || voucher.active === false)
    return invalid("Voucher không hợp lệ, đã dùng hoặc đã tắt.");
  if (voucher.userId && voucher.userId !== member?.id)
    return invalid("Voucher thuộc tài khoản khác.");
  if (voucher.startDate && voucher.startDate > localDay(at))
    return invalid("Voucher chưa đến ngày áp dụng.");
  if (isVoucherExpired(voucher.expiry, at))
    return invalid("Voucher đã hết hạn.");
  if (
    voucher.usageLimit &&
    Number(voucher.usedCount || 0) >= Number(voucher.usageLimit)
  )
    return invalid("Voucher đã hết lượt sử dụng.");
  if (subtotal < Number(voucher.minOrder || 0))
    return invalid(
      "Voucher áp dụng cho đơn từ " +
        Number(voucher.minOrder).toLocaleString("vi-VN") +
        "đ.",
    );
  if (voucher.requiresSilver && Number(member?.points || 0) < SILVER_MIN_POINTS)
    return invalid(
      "Voucher dành cho thành viên từ 50 điểm (Silver hoặc Gold).",
    );
  let discount =
    voucher.discount ??
    (voucher.type === "percent"
      ? Math.round((subtotal * Number(voucher.value)) / 100)
      : Number(voucher.value));
  if (voucher.type === "percent" && Number(voucher.maxDiscount) > 0)
    discount = Math.min(discount, Number(voucher.maxDiscount));
  return {
    ok: true,
    voucher,
    discount: Math.max(0, Math.min(discount, subtotal)),
    message: "Đã áp dụng voucher " + voucher.code + ".",
  };
}
// Cash is received at payment time, including drinks still being prepared.
export function shiftCashSummary(orders, shift) {
  const inShift = (order) =>
    order.shiftId
      ? order.shiftId === shift.id
      : order.cashierId === shift.cashierId &&
        order.paidAt >= shift.openedAt &&
        (!shift.closedAt || order.paidAt <= shift.closedAt);
  const cashOrders = orders.filter(
    (order) =>
      inShift(order) &&
      order.paymentMethod === "cash" &&
      order.paymentStatus === "paid",
  );
  const received = cashOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );
  const refunded = cashOrders
    .filter((order) => order.status === "Đã hủy")
    .reduce((sum, order) => sum + Number(order.total), 0);
  const expected = Number(shift.openingCash || 0) + received - refunded;
  return {
    received,
    refunded,
    net: received - refunded,
    expected,
    difference:
      shift.actualCash == null ? null : Number(shift.actualCash) - expected,
  };
}
