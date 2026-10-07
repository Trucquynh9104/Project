import Modal from "./Modal";
import { PAYMENT_METHODS } from "../../shared/businessRules";
const money = (value) => Number(value || 0).toLocaleString("vi-VN") + "đ";
export default function PaymentDialog({
  order,
  busy,
  error,
  onConfirm,
  onClose,
}) {
  return (
    <Modal title="Thanh toán mô phỏng" busy={busy} onClose={onClose}>
      <p>
        Mã đơn <b>{order.id}</b> · {PAYMENT_METHODS[order.paymentMethod]}
      </p>
      {order.paymentMethod === "qr" && (
        <div
          className="brew-demo-qr"
          aria-label="QR minh họa, không dùng chuyển khoản"
        >
          <svg viewBox="0 0 90 90" role="img" aria-label="QR mô phỏng">
            <rect width="90" height="90" fill="white" />
            {[
              [5, 5],
              [60, 5],
              [5, 60],
            ].map(([x, y]) => (
              <g key={x + "," + y}>
                <rect x={x} y={y} width="25" height="25" fill="#4d3428" />
                <rect x={x + 4} y={y + 4} width="17" height="17" fill="white" />
                <rect x={x + 8} y={y + 8} width="9" height="9" fill="#4d3428" />
              </g>
            ))}
            {[
              [40, 10],
              [35, 35],
              [50, 35],
              [65, 40],
              [35, 50],
              [50, 55],
              [65, 60],
              [80, 50],
              [40, 75],
              [55, 75],
              [75, 80],
            ].map(([x, y]) => (
              <rect
                key={x + "," + y}
                x={x}
                y={y}
                width="7"
                height="7"
                fill="#4d3428"
              />
            ))}
          </svg>
          <small>QR minh họa · Không chuyển tiền thật</small>
        </div>
      )}
      <h3>Tổng thanh toán: {money(order.total)}</h3>
      <p className="brew-hint">
        Đơn đang chờ kết quả. Voucher chỉ được ghi nhận đã dùng khi thanh toán
        thành công.
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="brew-toolbar">
        <button
          className="brew-button"
          disabled={busy}
          onClick={() => onConfirm("success")}
        >
          {busy ? "Đang xử lý…" : "Mô phỏng thành công"}
        </button>
        <button
          className="brew-button secondary"
          disabled={busy}
          onClick={() => onConfirm("failed")}
        >
          Mô phỏng thất bại
        </button>
        <button
          className="brew-button secondary"
          disabled={busy}
          onClick={onClose}
        >
          Thanh toán sau
        </button>
      </div>
    </Modal>
  );
}
