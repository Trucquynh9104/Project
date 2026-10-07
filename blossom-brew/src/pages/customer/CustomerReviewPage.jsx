import { useDataVersion } from "../../services/useLiveData";
import { action, store } from "../../services/dataStore";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  getCurrentUser,
  getMembershipLabel,
  logoutUser,
} from "../../services/authService";
import NotificationDropdown from "../../components/NotificationDropdown";
import CustomerAvatar from "../../components/CustomerAvatar";

const navigationItems = [
  { icon: "⌂", label: "Tổng quan", to: "/customer" },
  { icon: "⌁", label: "Menu & đặt món", to: "/customer/menu" },
  { icon: "□", label: "Giỏ hàng", to: "/customer/cart" },
  { icon: "◇", label: "Điểm & voucher", to: "/customer/points" },
  {
    icon: "◷",
    label: "Lịch sử đơn hàng",
    to: "/customer/history",
    active: true,
  },
  { icon: "✦", label: "Thông báo", to: "/customer/notices" },
  { icon: "?", label: "Hỗ trợ", to: "/customer/support" },
  { icon: "☷", label: "Thông tin cá nhân", to: "/customer/profile" },
];

function getCartCount() {
  try {
    const cart = JSON.parse(store.getItem("blossom-cart") || "[]");

    return cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
  } catch {
    return 0;
  }
}

function CustomerReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = getCurrentUser();
  const dataVersion = useDataVersion();

  const orderId = searchParams.get("orderId");

  const order = useMemo(() => {
    try {
      const orders = JSON.parse(store.getItem("blossom-orders") || "[]");

      return orders.find((item) => item.id === orderId) || null;
    } catch {
      return null;
    }
  }, [orderId, dataVersion]);

  const [productId, setProductId] = useState(
    () => searchParams.get("productId") || order?.items?.[0]?.productId || "",
  );
  const productName =
    order?.items?.find((v) => v.productId === productId)?.name ||
    "món uống này";
  const products = [
    ...new Map((order?.items || []).map((v) => [v.productId, v])).values(),
  ];
  const existingReview = useMemo(() => {
    try {
      const reviews = JSON.parse(store.getItem("blossom-reviews") || "[]");

      return (
        reviews.find(
          (item) =>
            item.orderId === orderId &&
            (!item.productId || item.productId === productId),
        ) || null
      );
    } catch {
      return null;
    }
  }, [orderId, productId, dataVersion]);

  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [submitted, setSubmitted] = useState(Boolean(existingReview));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setRating(existingReview?.rating || 0);
    setComment(existingReview?.comment || "");
    setSubmitted(Boolean(existingReview));
    setError("");
  }, [productId, existingReview]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const membershipLabel = getMembershipLabel(user.points);

  const isOrderOwner =
    order?.member?.id === user.id ||
    (!order?.member?.id && order?.receiver === user.name);

  const canReview =
    Boolean(order) && order.status === "Hoàn tất" && isOrderOwner;

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  async function handleSubmit(event) {
    event.preventDefault();
    if (!rating || !canReview || submitted || busy) return;
    if (!window.confirm("Xác nhận gửi đánh giá cho đơn hàng này?")) return;
    setBusy(true);
    setError("");
    const result = await action({
      type: "review",
      orderId,
      productId,
      rating,
      comment: comment.trim(),
    });
    setBusy(false);
    if (!result.ok) setError(result.message);
    if (result.ok) setSubmitted(true);
  }

  async function handleLogout() {
    await logoutUser();
    navigate("/");
  }

  return (
    <div className="bb-dashboard">
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
              className={item.active ? "bb-nav-item active" : "bb-nav-item"}
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
          <span>ĐÁNH GIÁ SẢN PHẨM</span>

          <div className="bb-topbar-actions">
            <NotificationDropdown />

            <button
              className="bb-cart-button"
              type="button"
              onClick={() => navigate("/customer/cart")}
            >
              Giỏ hàng <b>{getCartCount()}</b>
            </button>

            <CustomerAvatar />
          </div>
        </header>

        <section className="bb-content">
          <div className="bb-review-stage">
            {!canReview ? (
              <section className="bb-review-card">
                <h1>Chưa thể đánh giá đơn này.</h1>
                <p>
                  Chỉ đơn hàng đã hoàn tất của bạn mới có thể được đánh giá.
                </p>

                <button
                  className="primary-button"
                  type="button"
                  onClick={() => navigate("/customer/history")}
                >
                  Quay lại lịch sử đơn
                </button>
              </section>
            ) : (
              <form className="bb-review-card" onSubmit={handleSubmit}>
                <p className="bb-eyebrow">Order {orderId}</p>
                <h1>Bạn thấy {productName} thế nào?</h1>
                <label>
                  Chọn món trong đơn
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                  >
                    {products.map((v) => (
                      <option key={v.productId} value={v.productId}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>

                <p>
                  Đánh giá của bạn sẽ giúp Blossom Brew phục vụ tốt hơn mỗi
                  ngày.
                </p>

                <div className="bb-star-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      disabled={submitted || busy}
                      className={star <= rating ? "selected" : ""}
                      key={star}
                      type="button"
                      onClick={() => {
                        setRating(star);
                        setSubmitted(false);
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <textarea
                  disabled={submitted || busy}
                  maxLength="500"
                  value={comment}
                  onChange={(event) => {
                    setComment(event.target.value);
                    setSubmitted(false);
                  }}
                  placeholder="Chia sẻ cảm nhận của bạn về món uống..."
                />

                <small className="bb-review-length">
                  {comment.length}/500 ký tự
                </small>

                {error && (
                  <p role="alert" className="field-error">
                    {error}
                  </p>
                )}
                {submitted && (
                  <p className="bb-review-success">
                    Đánh giá của bạn đã được lưu. Cảm ơn bạn!
                  </p>
                )}

                <div className="bb-review-actions">
                  <button
                    className="outline-button"
                    type="button"
                    onClick={() => navigate("/customer/history")}
                  >
                    Để sau
                  </button>

                  <button
                    className="primary-button"
                    disabled={!rating || submitted || busy}
                    type="submit"
                  >
                    Gửi đánh giá
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default CustomerReviewPage;
