import { applyVoucher as evaluateCode } from "../../services/voucherService";
import { useLiveData } from "../../services/useLiveData";
import { action, store } from "../../services/dataStore";
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  getCurrentUser,
  getLoyaltyMembers,
  getMembershipTier,
  SILVER_MIN_POINTS,
} from "../../services/authService";
import CashierShell from "../../components/CashierShell";
import {
  notifyOrderCreated,
  notifyVoucherUsed,
} from "../../services/notificationService";
import { getProductSizes, getProducts } from "../../services/menuService";

const categories = ["Tất cả", "Cà phê", "Trà", "Đá xay", "Khác"];

function formatPrice(price) {
  return `${price.toLocaleString("vi-VN")}đ`;
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function CashierPOSPage() {
  const user = getCurrentUser();
  const vouchers = JSON.parse(store.getItem("blossom-vouchers") || "[]");
  const [category, setCategory] = useState("Tất cả");
  const [products] = useLiveData(getProducts);
  const [cart, setCart] = useState([]);
  const [orderRequestId, setOrderRequestId] = useState(() =>
    crypto.randomUUID(),
  );
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentResult, setPaymentResult] = useState("success");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [memberPhone, setMemberPhone] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberLookupError, setMemberLookupError] = useState("");
  const [message, setMessage] = useState("");
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customization, setCustomization] = useState({
    size: "M",
    sugar: "50%",
    ice: "Đá tiêu chuẩn",
    toppings: [],
    note: "",
  });

  const filteredProducts = useMemo(() => {
    const productsInCategory =
      category === "Tất cả"
        ? products
        : products.filter((product) => product.category === category);

    return [...productsInCategory]
      .filter((product) => product.available !== false)
      .sort(
        (first, second) =>
          Number(first.available === false) -
          Number(second.available === false),
      );
  }, [category, products]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const appliedVoucherIsEligible =
    appliedVoucher &&
    total >= appliedVoucher.minOrder &&
    (!appliedVoucher.requiresSilver ||
      selectedMember?.points >= SILVER_MIN_POINTS);

  const discountAmount = appliedVoucherIsEligible
    ? appliedVoucher.type === "percent"
      ? Math.min(
          Math.round((total * appliedVoucher.value) / 100),
          appliedVoucher.maxDiscount,
        )
      : Math.min(appliedVoucher.value, total)
    : 0;

  const finalTotal = Math.max(total - discountAmount, 0);

  const selectedSizePrice = selectedProduct
    ? getProductSizes(selectedProduct).find(
        (item) => item.size === customization.size,
      )?.price
    : 0;
  const selectedTotal = selectedProduct
    ? Number(selectedSizePrice || selectedProduct.price || 0) +
      customization.toppings.length * 5000
    : 0;

  if (!user || user.role !== "cashier") {
    return <Navigate to="/login" replace />;
  }

  function openProductModal(product) {
    const sizes = getProductSizes(product);
    const defaultSize =
      sizes.find((item) => item.size === "M")?.size || sizes[0]?.size || "M";

    setSelectedProduct(product);
    setCustomization({
      size: defaultSize,
      sugar: "50%",
      ice: "Đá tiêu chuẩn",
      toppings: [],
      note: "",
    });
  }

  function toggleTopping(topping) {
    setCustomization((current) => ({
      ...current,
      toppings: current.toppings.includes(topping)
        ? current.toppings.filter((item) => item !== topping)
        : [...current.toppings, topping],
    }));
  }

  function confirmAddToCart() {
    if (!selectedProduct) return;

    const cartItem = {
      ...selectedProduct,
      id: `${selectedProduct.id}-${Date.now()}`,
      quantity: 1,
      size: customization.size,
      sugar: customization.sugar,
      ice: customization.ice,
      toppings: customization.toppings,
      note: customization.note.trim(),
      price: selectedTotal,
    };

    setCart((currentCart) => [...currentCart, cartItem]);
    setSelectedProduct(null);
  }

  function changeQuantity(productId, amount) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + amount }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function showToast(type, text) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3200);
  }

  function applyVoucher() {
    const result = evaluateCode(voucherInput, total, selectedMember);
    if (!result.ok) {
      showToast("error", result.message);
      return;
    }
    setAppliedVoucher(result.voucher);
    setVoucherInput(result.voucher.code);
    showToast("success", result.message);
  }
  function removeVoucher() {
    setAppliedVoucher(null);
    setVoucherInput("");
    showToast("success", "Đã bỏ voucher khỏi đơn hàng.");
  }

  function findMember() {
    const normalizedPhone = memberPhone.replace(/\D/g, "");

    if (!normalizedPhone) {
      setSelectedMember(null);
      setMemberLookupError("Vui lòng nhập số điện thoại để tìm thành viên.");
      return;
    }

    const member = getLoyaltyMembers().find(
      (item) => item.phone.replace(/\D/g, "") === normalizedPhone,
    );

    if (!member) {
      setSelectedMember(null);
      setMemberLookupError("Không tìm thấy thành viên có số điện thoại này.");
      return;
    }

    setSelectedMember(member);
    setMemberPhone(member.phone);
    setMemberLookupError("");
  }

  function handleNewOrder() {
    setCart([]);
    setMemberPhone("");
    setSelectedMember(null);
    setMemberLookupError("");
    setPaymentMethod("cash");
    setMessage("");
    setVoucherInput("");
    setAppliedVoucher(null);
  }

  async function handleConfirmPayment() {
    if (!cart.length) {
      setMessage("Vui lòng chọn ít nhất một món.");
      return;
    }
    if (
      !window.confirm(
        `Xác nhận thanh toán đơn hàng ${formatPrice(finalTotal)}?`,
      )
    )
      return;
    if (paymentBusy) return;
    setPaymentBusy(true);
    const result = await action({
      type: "create-order",
      requestId: orderRequestId,
      paymentResult,
      items: cart,
      orderType: "counter",
      paymentMethod,
      member: selectedMember,
      voucherCode: appliedVoucher?.code || "",
    });
    setPaymentBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setOrderRequestId(crypto.randomUUID());
    setMessage(`Đã tạo đơn ${result.order.id}, chờ pha.`);
    setCart([]);
    setMemberPhone("");
    setSelectedMember(null);
    setMemberLookupError("");
    setVoucherInput("");
    setAppliedVoucher(null);
  }

  return (
    <>
      <CashierShell
        active="pos"
        className="cashier-pos-page"
        topbarDescription="Chọn món, tìm thành viên và hoàn tất thanh toán cho khách."
        topbarTitle="Tạo đơn tại quầy."
        user={user}
      >
        <section className="cashier-content">
          <div className="cashier-page-actions">
            <button
              className="cashier-outline-button"
              type="button"
              onClick={handleNewOrder}
            >
              ＋ Đơn mới
            </button>
          </div>

          <div className="cashier-pos-layout">
            <section className="cashier-menu-panel">
              <div className="cashier-tabs">
                {categories.map((item) => (
                  <button
                    className={category === item ? "active" : ""}
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="cashier-product-grid">
                {filteredProducts.map((product) => (
                  <button
                    className={
                      product.available
                        ? "cashier-product-card"
                        : "cashier-product-card is-unavailable"
                    }
                    disabled={!product.available}
                    key={product.id}
                    type="button"
                    onClick={() => openProductModal(product)}
                  >
                    <div className="cashier-product-image">☕</div>
                    <small>{product.category}</small>
                    <strong>{product.name}</strong>
                    <b>{formatPrice(product.price)}</b>
                    {!product.available && (
                      <span className="cashier-product-unavailable">
                        Không khả dụng
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>

            <aside className="cashier-order-panel">
              <h2>Đơn hàng mới</h2>

              <div className="cashier-member-box">
                <label htmlFor="member-phone">THÀNH VIÊN / SỐ ĐIỆN THOẠI</label>

                <div className="cashier-member-search">
                  <input
                    id="member-phone"
                    value={memberPhone}
                    placeholder="090 123 4567"
                    onChange={(event) => {
                      setMemberPhone(event.target.value);
                      setSelectedMember(null);
                      setMemberLookupError("");
                    }}
                  />
                  <button type="button" onClick={findMember}>
                    Tìm
                  </button>
                </div>

                {selectedMember && (
                  <div className="cashier-member-result">
                    <strong>✓ {selectedMember.name}</strong>
                    <br />
                    <span>
                      {selectedMember.phone} ·{" "}
                      {getMembershipTier(selectedMember.points)} ·{" "}
                      {selectedMember.points} điểm
                    </span>
                  </div>
                )}

                {memberLookupError && (
                  <div className="cashier-member-not-found">
                    <span>{memberLookupError}</span>
                    <small>
                      Khách chưa là thành viên có thể mua với khách vãng lai.
                      Admin quản lý việc thêm thành viên.
                    </small>
                  </div>
                )}
              </div>

              <div className="cashier-order-items">
                {cart.length === 0 && (
                  <p className="cashier-empty-cart">
                    Chưa có món nào trong đơn.
                  </p>
                )}

                {cart.map((item) => (
                  <div className="cashier-order-item" key={item.id}>
                    <div className="cashier-order-item-info">
                      <strong>{item.name}</strong>
                      <small>
                        Size {item.size} · Đường {item.sugar} · {item.ice}
                        {item.toppings.length > 0 &&
                          ` · ${item.toppings.join(", ")}`}
                        {item.note && ` · Ghi chú: ${item.note}`}
                      </small>
                    </div>

                    <strong
                      className="cashier-item-price"
                      style={{ marginLeft: "auto", whiteSpace: "nowrap" }}
                    >
                      {formatPrice(item.price * item.quantity)}
                    </strong>

                    <div className="cashier-quantity">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, -1)}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, 1)}
                      >
                        ＋
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cashier-voucher-box">
                <label htmlFor="cashier-voucher">MÃ ƯU ĐÃI</label>
                <div className="cashier-voucher-input">
                  <input
                    id="cashier-voucher"
                    value={voucherInput}
                    onChange={(event) => setVoucherInput(event.target.value)}
                    placeholder="Nhập mã voucher"
                  />
                  <button type="button" onClick={applyVoucher}>
                    Áp dụng
                  </button>
                </div>

                {appliedVoucher && (
                  <p className="cashier-applied-voucher">
                    <span>
                      {appliedVoucherIsEligible
                        ? `✓ Đã áp dụng ${appliedVoucher.code}`
                        : `! ${appliedVoucher.code} không còn đủ điều kiện`}
                    </span>
                    <button type="button" onClick={removeVoucher}>
                      Bỏ
                    </button>
                  </p>
                )}
              </div>

              <div className="cashier-price-row">
                <span>Tạm tính</span>
                <strong>{formatPrice(total)}</strong>
              </div>

              <div className="cashier-price-row">
                <span>Giảm giá</span>
                <strong>-{formatPrice(discountAmount)}</strong>
              </div>

              <div className="cashier-total-row">
                <span>Tổng thanh toán</span>
                <strong>{formatPrice(finalTotal)}</strong>
              </div>

              <label className="brew-payment-sim">
                <input
                  type="checkbox"
                  checked={paymentResult === "failed"}
                  onChange={(e) =>
                    setPaymentResult(e.target.checked ? "failed" : "success")
                  }
                />{" "}
                Mô phỏng giao dịch thất bại
              </label>
              <p className="brew-hint">
                Thanh toán mô phỏng, không thu tiền thật. Mở ca trước khi tạo
                đơn.
              </p>
              <div className="cashier-payment-methods">
                <button
                  className={paymentMethod === "cash" ? "active" : ""}
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                >
                  Tiền mặt
                </button>
                <button
                  className={paymentMethod === "qr" ? "active" : ""}
                  type="button"
                  onClick={() => setPaymentMethod("qr")}
                >
                  QR
                </button>
                <button
                  className={paymentMethod === "card" ? "active" : ""}
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                >
                  Thẻ
                </button>
              </div>

              <button
                className="cashier-confirm-button"
                type="button"
                onClick={handleConfirmPayment}
              >
                Xác nhận thanh toán · {formatPrice(finalTotal)}
              </button>

              {message && <p className="cashier-message">{message}</p>}
            </aside>
          </div>
        </section>
      </CashierShell>

      {selectedProduct && (
        <div
          className="cashier-modal-overlay"
          onClick={() => setSelectedProduct(null)}
        >
          <section
            className="cashier-product-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="cashier-modal-close"
              type="button"
              onClick={() => setSelectedProduct(null)}
            >
              ×
            </button>

            <div className="cashier-modal-image">☕</div>
            <p className="cashier-eyebrow">{selectedProduct.category}</p>
            <h2>{selectedProduct.name}</h2>
            <p className="cashier-modal-base-price">
              Giá từ: {formatPrice(selectedProduct.price)}
            </p>

            <div className="cashier-customization-group">
              <strong>Chọn size</strong>
              <div className="cashier-option-row">
                {getProductSizes(selectedProduct).map((item) => (
                  <button
                    className={customization.size === item.size ? "active" : ""}
                    key={item.size}
                    type="button"
                    onClick={() =>
                      setCustomization((current) => ({
                        ...current,
                        size: item.size,
                      }))
                    }
                  >
                    Size {item.size} · {formatPrice(item.price)}
                  </button>
                ))}
              </div>
            </div>

            <div className="cashier-customization-group">
              <strong>Lượng đường</strong>
              <div className="cashier-option-row">
                {["Không đường", "30%", "50%", "100%"].map((sugar) => (
                  <button
                    className={customization.sugar === sugar ? "active" : ""}
                    key={sugar}
                    type="button"
                    onClick={() =>
                      setCustomization((current) => ({ ...current, sugar }))
                    }
                  >
                    {sugar}
                  </button>
                ))}
              </div>
            </div>

            <div className="cashier-customization-group">
              <strong>Lượng đá</strong>
              <div className="cashier-option-row">
                {["Không đá", "Ít đá", "Đá tiêu chuẩn"].map((ice) => (
                  <button
                    className={customization.ice === ice ? "active" : ""}
                    key={ice}
                    type="button"
                    onClick={() =>
                      setCustomization((current) => ({ ...current, ice }))
                    }
                  >
                    {ice}
                  </button>
                ))}
              </div>
            </div>

            <div className="cashier-customization-group">
              <strong>Topping · 5.000đ/món</strong>
              <div className="cashier-topping-list">
                {["Trân châu trắng", "Thạch đào", "Kem cheese"].map(
                  (topping) => (
                    <label key={topping}>
                      <input
                        checked={customization.toppings.includes(topping)}
                        type="checkbox"
                        onChange={() => toggleTopping(topping)}
                      />
                      {topping}
                    </label>
                  ),
                )}
              </div>
            </div>

            <div className="cashier-customization-group">
              <strong>Ghi chú</strong>
              <textarea
                value={customization.note}
                placeholder="Ví dụ: không dùng ống hút, giao sau 10 phút..."
                maxLength="150"
                onChange={(event) =>
                  setCustomization((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
              />
            </div>

            <button
              className="cashier-confirm-button"
              type="button"
              onClick={confirmAddToCart}
            >
              Xác nhận thêm món · {formatPrice(selectedTotal)}
            </button>
          </section>
        </div>
      )}

      {toast && (
        <div className={`cashier-toast ${toast.type}`} role="status">
          {toast.text}
        </div>
      )}
    </>
  );
}

export default CashierPOSPage;
