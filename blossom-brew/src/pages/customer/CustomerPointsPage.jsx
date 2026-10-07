import { useLiveData, useDataVersion } from "../../services/useLiveData";
import { isVoucherExpired, localDay } from "../../../shared/businessRules";
import { store } from "../../services/dataStore";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  getMembershipTier,
  getCurrentUser,
  GOLD_MIN_POINTS,
  logoutUser,
  redeemPointsVoucher,
  SILVER_MIN_POINTS,
} from "../../services/authService";
import NotificationDropdown from "../../components/NotificationDropdown";
import CustomerAvatar from "../../components/CustomerAvatar";
import { notifyPointsRedeemed } from "../../services/notificationService";

const VOUCHERS_KEY = "blossom-vouchers";
const SILVER_POINTS = SILVER_MIN_POINTS;
const GOLD_POINTS = GOLD_MIN_POINTS;

const defaultVouchers = [
  {
    id: "voucher-1",
    code: "BBSILVER",
    type: "percent",
    value: 20,
    minOrder: 80000,
    maxDiscount: 30000,
    active: true,
    expiry: "2026-12-31",
    requiresSilver: true,
  },
  {
    id: "voucher-2",
    code: "WELCOME25",
    type: "fixed",
    value: 25000,
    minOrder: 60000,
    maxDiscount: 0,
    active: true,
    expiry: "2026-12-31",
    requiresSilver: false,
  },
];

const navigationItems = [
  { icon: "⌂", label: "Tổng quan", to: "/customer" },
  { icon: "⌁", label: "Menu & đặt món", to: "/customer/menu" },
  { icon: "□", label: "Giỏ hàng", to: "/customer/cart" },
  { icon: "◇", label: "Điểm & voucher", to: "/customer/points", active: true },
  { icon: "◷", label: "Lịch sử đơn hàng", to: "/customer/history" },
  { icon: "✦", label: "Thông báo", to: "/customer/notices" },
  { icon: "?", label: "Hỗ trợ", to: "/customer/support" },
  { icon: "☷", label: "Thông tin cá nhân", to: "/customer/profile" },
];

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

function formatDate(date) {
  if (!date) return "Không giới hạn";

  const [year, month, day] = date.split("-");
  return year && month && day ? `${day}/${month}/${year}` : date;
}

function isExpired(expiry) {
  return isVoucherExpired(expiry);
}

function getAdminVouchers() {
  try {
    const savedVouchers = JSON.parse(store.getItem(VOUCHERS_KEY) || "[]");

    return savedVouchers;
  } catch {
    return [];
  }
}

function getVoucherDescription(voucher) {
  if (voucher.type === "percent") {
    const maxDiscount = Number(voucher.maxDiscount || 0);

    return maxDiscount > 0
      ? `Giảm ${voucher.value}%, tối đa ${formatPrice(maxDiscount)} cho đơn từ ${formatPrice(voucher.minOrder)}.`
      : `Giảm ${voucher.value}% cho đơn từ ${formatPrice(voucher.minOrder)}.`;
  }

  return `Giảm ${formatPrice(voucher.value)} cho đơn từ ${formatPrice(voucher.minOrder)}.`;
}

function getVoucherConditions(voucher) {
  const conditions = [
    `Áp dụng cho đơn hàng từ ${formatPrice(voucher.minOrder)}.`,
    "Mỗi đơn hàng chỉ dùng một voucher.",
  ];

  if (voucher.type === "percent" && Number(voucher.maxDiscount || 0) > 0) {
    conditions.unshift(`Giảm tối đa ${formatPrice(voucher.maxDiscount)}.`);
  }

  if (voucher.requiresSilver) {
    conditions.unshift(
      `Chỉ áp dụng thành viên Silver từ ${SILVER_POINTS} điểm.`,
    );
  }

  return conditions;
}

function getCartCount() {
  try {
    return JSON.parse(store.getItem("blossom-cart") || "[]").reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );
  } catch {
    return 0;
  }
}

function CustomerPointsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useLiveData(getCurrentUser);
  const dataVersion = useDataVersion();
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [pointsToRedeem, setPointsToRedeem] = useState("10");
  const [message, setMessage] = useState("");

  const membershipStats = useMemo(() => {
    if (!user) return { completedCount: 0, totalSpent: 0 };

    try {
      const completedOrders = JSON.parse(
        store.getItem("blossom-orders") || "[]",
      ).filter(
        (order) =>
          order.status === "Hoàn tất" &&
          (order.member?.id === user.id ||
            (!order.member?.id && order.receiver === user.name)),
      );

      return {
        completedCount: completedOrders.length,
        totalSpent: completedOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0,
        ),
      };
    } catch {
      return { completedCount: 0, totalSpent: 0 };
    }
  }, [user, dataVersion]);

  const activeVouchers = useMemo(() => {
    return getAdminVouchers().filter(
      (voucher) =>
        voucher.active &&
        !isExpired(voucher.expiry) &&
        (!voucher.startDate || voucher.startDate <= localDay()) &&
        (!voucher.usageLimit ||
          Number(voucher.usedCount || 0) < Number(voucher.usageLimit)),
    );
  }, [dataVersion]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const points = Number(user.points || 0);
  const memberTier = getMembershipTier(points);

  const nextTier =
    points < SILVER_POINTS
      ? { name: "Silver", target: SILVER_POINTS }
      : points < GOLD_POINTS
        ? { name: "Gold", target: GOLD_POINTS }
        : null;

  const progress = nextTier
    ? Math.min((points / nextTier.target) * 100, 100)
    : 100;
  const pointsToNextTier = nextTier ? Math.max(nextTier.target - points, 0) : 0;
  const enteredPoints = Number(pointsToRedeem);
  const canRedeem =
    Number.isInteger(enteredPoints) &&
    enteredPoints >= 10 &&
    enteredPoints <= points;

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await logoutUser();
    navigate("/");
  }

  function chooseVoucher(voucher) {
    if (voucher.requiresSilver && points < SILVER_POINTS) {
      setMessage(
        `Voucher ${voucher.code} chỉ dành cho thành viên Silver từ ${SILVER_POINTS} điểm.`,
      );
      return;
    }

    store.setItem("blossom-selected-voucher", voucher.code);
    navigate("/customer/menu");
  }

  function openRedeemModal() {
    setPointsToRedeem("10");
    setSelectedVoucher({ code: "Đổi điểm" });
  }

  async function confirmRedeemPoints() {
    const result = await redeemPointsVoucher({ pointsToRedeem: enteredPoints });

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setUser(result.user);
    setSelectedVoucher(null);
    store.setItem("blossom-selected-voucher", result.voucher.code);
    notifyPointsRedeemed({ user: result.user, voucher: result.voucher });
    setMessage(`${result.message} Đang chuyển đến menu.`);

    window.setTimeout(() => {
      navigate("/customer/menu");
    }, 900);
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
            <small>{memberTier} member</small>
          </div>

          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="bb-main">
        <header className="bb-topbar">
          <span>ĐIỂM & VOUCHER</span>

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

        <section className="bb-content bb-membership-page">
          <p className="bb-eyebrow">Membership</p>
          <h1>Điểm & ưu đãi.</h1>
          <p className="bb-subtitle">
            Tích luỹ mỗi lần ghé quán và đổi những ưu đãi dành cho bạn.
          </p>

          <div className="bb-membership-row">
            <article className="bb-membership-card">
              <p>Hạng thành viên · {memberTier}</p>
              <h2>{points} điểm</h2>
              <span>Điểm của bạn sẽ hết hạn vào 31/12/2026</span>
              <hr />
              <small>
                {membershipStats.completedCount} đơn hàng ·{" "}
                {formatPrice(membershipStats.totalSpent)} tổng chi tiêu
              </small>
            </article>

            <article className="bb-tier-card">
              <p>Your next tier</p>

              <h2>
                {points >= GOLD_POINTS
                  ? "Bạn đã đạt Gold."
                  : `Chạm mốc ${nextTier.name}.`}
              </h2>

              <span>
                {points >= GOLD_POINTS
                  ? "Bạn đang nhận được những ưu đãi của hạng Gold."
                  : `Tích thêm ${pointsToNextTier} điểm để mở khoá ưu đãi ${nextTier.name}.`}
              </span>

              <div className="bb-tier-progress">
                <i style={{ width: `${progress}%` }} />
              </div>

              <small>
                {Math.min(points, nextTier.target)} / {nextTier.target} điểm
              </small>
            </article>
          </div>

          <p className="bb-eyebrow bb-voucher-eyebrow">Ready to use</p>
          <h2 className="bb-voucher-title">Voucher của bạn.</h2>

          <div className="bb-voucher-grid">
            {activeVouchers.map((voucher, index) => (
              <article
                className="bb-voucher-card"
                key={voucher.id || voucher.code}
              >
                <span className="bb-voucher-icon">
                  {index === 0 ? "◇" : "✦"}
                </span>

                <h3>{voucher.code}</h3>
                <p>{getVoucherDescription(voucher)}</p>

                <div className="bb-voucher-actions">
                  <button type="button" onClick={() => chooseVoucher(voucher)}>
                    Dùng ngay
                  </button>

                  <button
                    className="bb-detail-button"
                    type="button"
                    onClick={() => setSelectedVoucher(voucher)}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </article>
            ))}

            <article className="bb-voucher-card" key="redeem-points">
              <span className="bb-voucher-icon">○</span>
              <h3>Đổi điểm</h3>
              <p>Đổi tối thiểu 10 điểm để nhận voucher giảm giá tương ứng.</p>

              <div className="bb-voucher-actions">
                <button type="button" onClick={openRedeemModal}>
                  Đổi điểm
                </button>

                <button
                  className="bb-detail-button"
                  type="button"
                  onClick={openRedeemModal}
                >
                  Xem chi tiết
                </button>
              </div>
            </article>
          </div>
        </section>
      </main>

      {message && (
        <div className="toast">
          <span>{message}</span>

          <button type="button" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}

      {selectedVoucher && (
        <div
          className="bb-voucher-modal-overlay"
          onClick={() => setSelectedVoucher(null)}
        >
          <section
            className="bb-voucher-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="bb-voucher-close"
              type="button"
              onClick={() => setSelectedVoucher(null)}
            >
              ×
            </button>

            {selectedVoucher.code === "Đổi điểm" ? (
              <>
                <p className="bb-eyebrow">Points exchange</p>
                <h2>Đổi điểm lấy voucher</h2>
                <p className="bb-voucher-modal-description">
                  Nhập số điểm muốn đổi. Mỗi 1 điểm đổi thành voucher giảm
                  1.000đ; đổi tối thiểu 10 điểm.
                </p>

                <label>
                  SỐ ĐIỂM MUỐN ĐỔI
                  <input
                    type="number"
                    min="10"
                    max={points}
                    value={pointsToRedeem}
                    onChange={(event) => setPointsToRedeem(event.target.value)}
                  />
                </label>

                <p className="bb-voucher-expiry">
                  Voucher nhận được: giảm {formatPrice(enteredPoints * 1000)}
                </p>

                <button
                  className="primary-button full-button"
                  type="button"
                  onClick={confirmRedeemPoints}
                  disabled={!canRedeem}
                >
                  {points < 10
                    ? "Chưa đủ 10 điểm"
                    : `Xác nhận đổi ${enteredPoints || 0} điểm`}
                </button>
              </>
            ) : (
              <>
                <p className="bb-eyebrow">Voucher detail</p>
                <h2>{selectedVoucher.code}</h2>
                <p className="bb-voucher-modal-description">
                  {getVoucherDescription(selectedVoucher)}
                </p>
                <p className="bb-voucher-expiry">
                  Hạn sử dụng: {formatDate(selectedVoucher.expiry)}
                </p>
                <h3>Điều kiện áp dụng</h3>

                <ul>
                  {getVoucherConditions(selectedVoucher).map((condition) => (
                    <li key={condition}>{condition}</li>
                  ))}
                </ul>

                <button
                  className="primary-button full-button"
                  type="button"
                  onClick={() => chooseVoucher(selectedVoucher)}
                >
                  Dùng voucher này
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default CustomerPointsPage;
