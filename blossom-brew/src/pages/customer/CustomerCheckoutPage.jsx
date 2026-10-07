import PaymentDialog from "../../components/PaymentDialog";
import { applyVoucher } from "../../services/voucherService";
import { action, store } from "../../services/dataStore";
import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  getCurrentUser,
  getMembershipLabel,
  getPersonalVouchers,
  logoutUser,
  SILVER_MIN_POINTS,
  consumePersonalVoucher,
} from "../../services/authService";
import NotificationDropdown from "../../components/NotificationDropdown";
import CustomerAvatar from "../../components/CustomerAvatar";
import {
  notifyOrderCreated,
  notifyVoucherUsed,
} from "../../services/notificationService";

const navigationItems = [
  { icon: "⌂", label: "Tổng quan", to: "/customer" },
  { icon: "⌁", label: "Menu & đặt món", to: "/customer/menu" },
  { icon: "□", label: "Giỏ hàng", to: "/customer/cart" },
  { icon: "◇", label: "Điểm & voucher", to: "/customer/points" },
  { icon: "◷", label: "Lịch sử đơn hàng", to: "/customer/history" },
  { icon: "✦", label: "Thông báo", to: "/customer/notices" },
  { icon: "?", label: "Hỗ trợ", to: "/customer/support" },
  { icon: "☷", label: "Thông tin cá nhân", to: "/customer/profile" },
];

function getCart() {
  try {
    return JSON.parse(store.getItem("blossom-cart") || "[]");
  } catch {
    return [];
  }
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

function getVoucherResult({ voucherCode, user, subtotal }) {
  if (!voucherCode) return { discount: 0, isValid: false, message: "" };
  const result = applyVoucher(voucherCode, subtotal, user);
  return {
    ...result,
    isValid: result.ok,
    isPersonalVoucher: !!result.voucher?.userId,
  };
}
function getPendingOrder(orderId) {
  const id = orderId || store.getItem("blossom-checkout-order");
  return (
    JSON.parse(store.getItem("blossom-orders") || "[]").find(
      (o) => o.id === id && o.paymentStatus !== "paid" && o.status !== "Đã hủy",
    ) || null
  );
}

function CustomerCheckoutPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [params] = useSearchParams();
  const [pendingOrder, setPendingOrder] = useState(() =>
    getPendingOrder(params.get("orderId")),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [cart, setCart] = useState(() => pendingOrder?.items || getCart());
  const [orderType, setOrderType] = useState("pickup");
  const [orderRequestId, setOrderRequestId] = useState(() =>
    crypto.randomUUID(),
  );
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(
    pendingOrder?.paymentMethod || "qr",
  );
  const [showErrors, setShowErrors] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState("");
  const [form, setForm] = useState({
    name: pendingOrder?.receiver || user?.name || "",
    phone: pendingOrder?.deliveryInfo?.phone || user?.phone || "",
    address: "",
    note: "",
  });

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      ),
    [cart],
  );

  const voucherCode =
    store.getItem("blossom-selected-voucher") ||
    pendingOrder?.voucherCode ||
    "";
  const voucherResult = useMemo(() => {
    if (!user)
      return {
        discount: 0,
        message: "",
        isValid: false,
        isPersonalVoucher: false,
      };
    return getVoucherResult({ voucherCode, user, subtotal });
  }, [subtotal, user, voucherCode]);

  const discount = voucherResult.discount;
  const total = Math.max(subtotal - discount, 0);
  const cartCount = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  if (!user) return <Navigate to="/login" replace />;

  const membershipLabel = getMembershipLabel(user.points);

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const errors = {};
  const normalizedPhone = form.phone.replace(/[\s.-]/g, "");

  if (!form.name.trim()) errors.name = "Vui lòng nhập họ và tên.";
  if (!/^(0\d{9}|\+84\d{9})$/.test(normalizedPhone)) {
    errors.phone = "Số điện thoại chưa đúng định dạng.";
  }
  if (orderType === "delivery" && !form.address.trim()) {
    errors.address = "Vui lòng nhập địa chỉ giao hàng.";
  }

  const isFormValid = Object.keys(errors).length === 0 && cart.length > 0;

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleLogout() {
    await logoutUser();
    navigate("/");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setShowErrors(true);
    setPaymentError("");
    if (!isFormValid || paymentBusy) return;
    if (voucherCode && !voucherResult.isValid) {
      setPaymentError(voucherResult.message);
      return;
    }
    if (pendingOrder) {
      setPendingOrder({ ...pendingOrder, paymentMethod });
      setDialogOpen(true);
      return;
    }
    if (
      !window.confirm(
        `Xác nhận tạo đơn nhận tại quán với tổng tiền ${formatPrice(total)}?`,
      )
    )
      return;
    setPaymentBusy(true);
    const result = await action({
      type: "create-order",
      requestId: orderRequestId,
      paymentResult: "pending",
      items: cart,
      orderType: "pickup",
      paymentMethod,
      receiver: form.name.trim(),
      deliveryInfo: { phone: normalizedPhone, note: form.note.trim() },
      voucherCode,
    });
    setPaymentBusy(false);
    if (!result.ok) {
      setPaymentError(result.message);
      return;
    }
    setPendingOrder(result.order);
    store.setItem("blossom-checkout-order", result.order.id);
    setDialogOpen(true);
  }
  async function confirmPayment(paymentResult) {
    if (paymentBusy) return;
    setPaymentBusy(true);
    setPaymentError("");
    const result = await action({
      type: "pay-order",
      orderId: pendingOrder.id,
      paymentMethod,
      paymentResult,
      voucherCode,
      expectedTotal: pendingOrder.total,
    });
    setPaymentBusy(false);
    if (result.order) setPendingOrder(result.order);
    if (!result.ok) {
      setPaymentError(result.message);
      return;
    }
    setOrderRequestId(crypto.randomUUID());
    store.removeItem("blossom-cart");
    store.removeItem("blossom-selected-voucher");
    store.removeItem("blossom-checkout-order");
    setCart([]);
    setCreatedOrderId(result.order.id);
    setSubmitted(true);
    setDialogOpen(false);
  }

  return (
    <div className="bb-dashboard">
      {dialogOpen && pendingOrder && (
        <PaymentDialog
          order={pendingOrder}
          busy={paymentBusy}
          error={paymentError}
          onConfirm={confirmPayment}
          onClose={() => {
            setDialogOpen(false);
            navigate("/customer/history");
          }}
        />
      )}
      <aside className="bb-sidebar">
        <button
          className="bb-brand"
          type="button"
          onClick={() => navigate("/customer")}
        >
          <span>B</span>
          Blossom Brew
        </button>

        <p className="bb-sidebar-label">Customer space</p>

        <nav className="bb-sidebar-nav">
          {navigationItems.map((item) => (
            <button
              className="bb-nav-item"
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="bb-sidebar-profile">
          <span className="bb-avatar">{initials}</span>
          <div>
            <strong>{user.name}</strong>
            <small>{membershipLabel}</small>
          </div>
          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="bb-main">
        <header className="bb-topbar">
          <span>THANH TOÁN</span>
          <div className="bb-topbar-actions">
            <NotificationDropdown />
            <button
              className="bb-cart-button"
              type="button"
              onClick={() => navigate("/customer/cart")}
            >
              Giỏ hàng <b>{cartCount}</b>
            </button>
            <CustomerAvatar />
          </div>
        </header>

        <section className="bb-content bb-checkout-page">
          {submitted ? (
            <section className="bb-checkout-success">
              <p className="bb-eyebrow">Order created</p>
              <h1>Đặt hàng thành công.</h1>
              <p>
                Mã đơn của bạn là <strong>{createdOrderId}</strong>.
              </p>
              <p>
                Đơn đang chờ xác nhận. Bạn có thể theo dõi tại Lịch sử đơn hàng.
              </p>
              <div className="bb-checkout-success-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => navigate("/customer/history")}
                >
                  Xem lịch sử đơn
                </button>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => navigate("/customer/menu")}
                >
                  Tiếp tục đặt món
                </button>
              </div>
            </section>
          ) : cart.length === 0 ? (
            <section className="bb-empty-cart">
              <h1>Giỏ hàng đang trống.</h1>
              <p>Hãy chọn món trước khi thanh toán.</p>
              <button
                className="primary-button"
                type="button"
                onClick={() => navigate("/customer/menu")}
              >
                Chọn món ngay
              </button>
            </section>
          ) : (
            <>
              <p className="bb-eyebrow">Checkout</p>
              <h1>Hoàn tất đơn hàng.</h1>
              <p className="bb-subtitle">
                Kiểm tra thông tin nhận hàng và chọn phương thức thanh toán.
              </p>

              <div className="bb-checkout-layout">
                <form
                  className="bb-checkout-form"
                  noValidate
                  onSubmit={handleSubmit}
                >
                  <section className="bb-checkout-section">
                    <h2>Hình thức nhận hàng</h2>
                    <div className="bb-order-type-row">
                      <button
                        className={orderType === "pickup" ? "active" : ""}
                        type="button"
                        onClick={() => setOrderType("pickup")}
                      >
                        Nhận tại quán
                      </button>
                    </div>
                  </section>

                  <section className="bb-checkout-section">
                    <h2>Thông tin người nhận</h2>
                    <label>
                      HỌ VÀ TÊN <span className="required-mark">*</span>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className={
                          showErrors && errors.name ? "input-error" : ""
                        }
                        placeholder="Nhập họ và tên"
                      />
                      {showErrors && errors.name && (
                        <small className="field-error">{errors.name}</small>
                      )}
                    </label>
                    <label>
                      SỐ ĐIỆN THOẠI <span className="required-mark">*</span>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        className={
                          showErrors && errors.phone ? "input-error" : ""
                        }
                        placeholder="0912 345 678"
                      />
                      {showErrors && errors.phone && (
                        <small className="field-error">{errors.phone}</small>
                      )}
                    </label>
                    {orderType === "delivery" && (
                      <label>
                        ĐỊA CHỈ GIAO HÀNG{" "}
                        <span className="required-mark">*</span>
                        <input
                          name="address"
                          value={form.address}
                          onChange={handleChange}
                          className={
                            showErrors && errors.address ? "input-error" : ""
                          }
                          placeholder="Số nhà, đường, phường/xã..."
                        />
                        {showErrors && errors.address && (
                          <small className="field-error">
                            {errors.address}
                          </small>
                        )}
                      </label>
                    )}
                    <label>
                      GHI CHÚ
                      <textarea
                        name="note"
                        value={form.note}
                        onChange={handleChange}
                        placeholder="Ví dụ: Tôi sẽ đến nhận lúc 15:00…"
                      />
                    </label>
                  </section>

                  <section className="bb-checkout-section">
                    <h2>Phương thức thanh toán</h2>
                    <p className="brew-hint">
                      Thanh toán mô phỏng · Đơn nhận tại quán. Không thu tiền
                      thật.
                    </p>
                    <div className="bb-payment-row">
                      <button
                        className={paymentMethod === "qr" ? "active" : ""}
                        type="button"
                        onClick={() => setPaymentMethod("qr")}
                      >
                        QR
                      </button>
                      <button
                        className={paymentMethod === "wallet" ? "active" : ""}
                        type="button"
                        onClick={() => setPaymentMethod("wallet")}
                      >
                        Ví điện tử
                      </button>
                      <button
                        className={paymentMethod === "card" ? "active" : ""}
                        type="button"
                        onClick={() => setPaymentMethod("card")}
                      >
                        Thẻ
                      </button>
                    </div>
                  </section>

                  <button
                    className="primary-button full-button"
                    type="submit"
                    disabled={!isFormValid || paymentBusy}
                  >
                    {paymentBusy
                      ? "Đang tạo đơn…"
                      : pendingOrder
                        ? "Tiếp tục thanh toán"
                        : "Tạo đơn và thanh toán"}{" "}
                    · {formatPrice(total)}
                  </button>
                  {paymentError && (
                    <p className="field-error" role="alert">
                      {paymentError}
                    </p>
                  )}
                </form>

                <aside className="bb-checkout-summary">
                  <h2>Đơn hàng của bạn</h2>
                  <div className="bb-checkout-items">
                    {cart.map((item) => (
                      <article key={item.cartId || item.id}>
                        <div>
                          <strong>
                            {item.name} ×{item.quantity}
                          </strong>
                          <small>
                            {[
                              item.size,
                              item.sugar,
                              item.ice,
                              item.toppings?.length
                                ? item.toppings.join(", ")
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        </div>
                        <b>
                          {formatPrice(
                            Number(item.price || 0) *
                              Number(item.quantity || 0),
                          )}
                        </b>
                      </article>
                    ))}
                  </div>

                  {voucherCode && (
                    <div className="bb-checkout-voucher">
                      <span>Voucher: {voucherCode}</span>
                      <small
                        className={
                          voucherResult.isValid
                            ? "voucher-success"
                            : "field-error"
                        }
                      >
                        {voucherResult.message}
                      </small>
                    </div>
                  )}

                  <div className="bb-checkout-price-row">
                    <span>Tạm tính</span>
                    <strong>{formatPrice(subtotal)}</strong>
                  </div>
                  <div className="bb-checkout-price-row">
                    <span>Giảm giá</span>
                    <strong>-{formatPrice(discount)}</strong>
                  </div>
                  <div className="bb-checkout-total">
                    <span>Tổng thanh toán</span>
                    <strong>{formatPrice(total)}</strong>
                  </div>
                </aside>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default CustomerCheckoutPage;
