import { useLiveData } from "../../services/useLiveData";
import { store } from "../../services/dataStore";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import DateRangeFilter from "../../components/DateRangeFilter";
import {
  getCurrentUser,
  logoutUser,
  getLoyaltyMembers,
  getMembershipTier,
} from "../../services/authService";
import { isInDateRange } from "../../utils/dateRange";

function getOrders() {
  try {
    return JSON.parse(store.getItem("blossom-orders") || "[]");
  } catch {
    return [];
  }
}

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function getDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getChartDates(fromDate, toDate) {
  const end = toDate ? new Date(`${toDate}T00:00:00`) : new Date();
  end.setHours(0, 0, 0, 0);

  const start = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date(end);
  if (!fromDate) start.setDate(start.getDate() - 6);

  const chartStart = new Date(
    Math.max(start.getTime(), end.getTime() - 6 * 86400000),
  );
  const dates = [];
  for (
    const date = new Date(chartStart);
    date <= end;
    date.setDate(date.getDate() + 1)
  ) {
    dates.push(new Date(date));
  }
  return dates;
}

function getPaymentLabel(value) {
  if (value === "cash") return "Tiền mặt";
  if (value === "card") return "Thẻ";
  if (value === "wallet") return "Ví điện tử";
  return "QR";
}

function AdminReportsPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [orders] = useLiveData(getOrders);
  const [allMembers] = useLiveData(getLoyaltyMembers);

  const report = useMemo(() => {
    const completedOrders = orders.filter(
      (order) =>
        order.status === "Hoàn tất" &&
        isInDateRange(order.completedAt || order.createdAt, fromDate, toDate),
    );

    const revenue = completedOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0,
    );

    const products = {};
    const payments = { QR: 0, "Tiền mặt": 0, Thẻ: 0, "Ví điện tử": 0 };
    const members = new Set();

    completedOrders.forEach((order) => {
      payments[getPaymentLabel(order.paymentMethod)] += Number(
        order.total || 0,
      );
      const memberKey =
        order.member?.id || order.member?.phone || order.receiver || "";

      if (memberKey) members.add(String(memberKey));
      (order.items || []).forEach((item) => {
        const name = item.name || "Món chưa xác định";
        products[name] = (products[name] || 0) + Number(item.quantity || 0);
      });
    });

    const dailyRevenue = getChartDates(fromDate, toDate).map((date) => {
      const total = completedOrders
        .filter((order) => {
          const orderDate = getDate(order.completedAt || order.createdAt);
          return orderDate && orderDate.toDateString() === date.toDateString();
        })
        .reduce((sum, order) => sum + Number(order.total || 0), 0);

      return {
        label: new Intl.DateTimeFormat("vi-VN", { weekday: "short" })
          .format(date)
          .replace("Thứ ", "T"),
        value: total,
      };
    });

    return {
      revenue,
      orders: completedOrders,
      average: completedOrders.length ? revenue / completedOrders.length : 0,
      memberCount: members.size,
      newMembers: allMembers.filter((v) =>
        isInDateRange(v.createdAt, fromDate, toDate),
      ).length,
      tiers: allMembers.reduce(
        (a, v) => {
          a[getMembershipTier(v.points)]++;
          return a;
        },
        { Member: 0, Silver: 0, Gold: 0 },
      ),
      voucherUses: completedOrders.filter((o) => o.voucherCode).length,
      voucherDiscount: completedOrders.reduce(
        (sum, o) => sum + Number(o.discount || 0),
        0,
      ),
      products: Object.entries(products)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((first, second) => second.quantity - first.quantity)
        .slice(0, 5),
      payments: Object.entries(payments).map(([name, value]) => ({
        name,
        value,
      })),
      dailyRevenue,
    };
  }, [fromDate, orders, toDate, allMembers]);

  if (!user || user.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const chartMax = Math.max(...report.dailyRevenue.map((day) => day.value), 1);
  const chartWidth = 1000;
  const chartHeight = 230;
  const chartPaddingX = 36;
  const chartPaddingY = 24;
  const revenueChartPoints = report.dailyRevenue.map((day, index) => {
    const usableWidth = chartWidth - chartPaddingX * 2;
    const usableHeight = chartHeight - chartPaddingY * 2;
    const x =
      report.dailyRevenue.length === 1
        ? chartWidth / 2
        : chartPaddingX +
          (index / (report.dailyRevenue.length - 1)) * usableWidth;
    const y =
      chartHeight - chartPaddingY - (day.value / chartMax) * usableHeight;

    return { ...day, x, y };
  });
  const paymentTotal = Math.max(report.revenue, 1);
  const productMax = Math.max(
    ...report.products.map((product) => product.quantity),
    1,
  );

  const navItems = [
    { icon: "⌂", label: "Tổng quan", to: "/admin" },
    { icon: "⌁", label: "Quản lý menu", to: "/admin/products" },
    { icon: "□", label: "Đơn hàng", to: "/admin/orders" },
    { icon: "◦", label: "Thành viên", to: "/admin/members" },
    { icon: "◇", label: "Voucher", to: "/admin/vouchers" },
    { icon: "♙", label: "Tài khoản thu ngân", to: "/admin/cashiers" },
    { icon: "◷", label: "Ca làm việc", to: "/admin/shifts" },
    { icon: "☆", label: "Đánh giá", to: "/admin/feedback" },
    { icon: "?", label: "Yêu cầu hỗ trợ", to: "/admin/support" },
    { icon: "↗", label: "Báo cáo", to: "/admin/reports", active: true },
    { icon: "✦", label: "Thông báo", to: "/admin/notices" },
    { icon: "○", label: "Thông tin cá nhân", to: "/admin/profile" },
  ];

  async function handleLogout() {
    await logoutUser();
    navigate("/");
  }

  function scrollToRevenueTrend() {
    document.getElementById("revenue-trend")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function exportReport() {
    const rows = [
      ["Chỉ số", "Giá trị"],
      ["Doanh thu", report.revenue],
      ["Đơn hoàn tất", report.orders.length],
      ["Giá trị đơn trung bình", Math.round(report.average)],
      ["Thành viên mới", report.newMembers],
      ["Lượt voucher trên đơn hoàn tất", report.voucherUses],
      ["Tổng giảm giá", report.voucherDiscount],
      ...Object.entries(report.tiers),
      [],
      ["Món bán chạy", "Số lượng"],
      ...report.products.map((product) => [product.name, product.quantity]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "bao-cao-blossom-brew.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="admin-dashboard admin-reports-page">
      <aside className="admin-sidebar">
        <button
          className="admin-brand"
          type="button"
          onClick={() => navigate("/admin")}
        >
          <span>B</span>Blossom Brew
        </button>
        <p className="admin-sidebar-label">Admin workspace</p>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <button
              className={
                item.active ? "admin-nav-item active" : "admin-nav-item"
              }
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="admin-profile">
          <span className="admin-avatar">{initials}</span>
          <div>
            <strong>{user.name}</strong>
            <small>Administrator</small>
          </div>
          <button type="button" onClick={handleLogout}>
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-page-title">
            <h1>Báo cáo & phân tích.</h1>
            <p>Tổng hợp các chỉ số quan trọng để hỗ trợ quyết định vận hành.</p>
          </div>
          <span>
            {new Intl.DateTimeFormat("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(new Date())}
          </span>
        </header>
        <section className="admin-content">
          <div className="admin-reports-toolbar">
            <DateRangeFilter
              className="admin-reports-date-range"
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
            />
          </div>

          <section className="admin-report-kpis">
            <article>
              <span className="admin-report-card-icon" aria-hidden="true">
                ↗
              </span>
              <h2>Doanh thu bán hàng</h2>
              <p>
                Doanh thu trong kỳ:{" "}
                <strong>{formatPrice(report.revenue)}</strong> từ{" "}
                {report.orders.length} đơn hoàn tất.
              </p>
              <button
                className="admin-outline-button"
                type="button"
                onClick={scrollToRevenueTrend}
              >
                Xem báo cáo
              </button>
            </article>
            <article>
              <span className="admin-report-card-icon" aria-hidden="true">
                ◇
              </span>
              <h2>Sản phẩm bán chạy</h2>
              <p>
                {report.products[0]
                  ? `${report.products[0].name} đang dẫn đầu với ${report.products[0].quantity} ly bán ra.`
                  : "Chưa có dữ liệu món bán trong kỳ đã chọn."}
              </p>
              <button
                className="admin-outline-button"
                type="button"
                onClick={scrollToRevenueTrend}
              >
                Xem báo cáo
              </button>
            </article>
            <article>
              <span className="admin-report-card-icon" aria-hidden="true">
                ○
              </span>
              <h2>Thành viên</h2>
              <p>
                {report.memberCount} khách đã phát sinh đơn hoàn tất. Giá trị
                đơn trung bình: <strong>{formatPrice(report.average)}</strong>.
              </p>
              <button
                className="admin-outline-button"
                type="button"
                onClick={scrollToRevenueTrend}
              >
                Xem báo cáo
              </button>
            </article>
          </section>

          <section className="brew-card brew-loyalty-report">
            <h2>Thành viên & ưu đãi</h2>
            <p>
              Thành viên mới trong kỳ: <b>{report.newMembers}</b> · Hạng hiện
              tại: Member <b>{report.tiers.Member}</b>, Silver{" "}
              <b>{report.tiers.Silver}</b>, Gold <b>{report.tiers.Gold}</b>
            </p>
            <p>
              Voucher trên đơn hoàn tất trong kỳ: <b>{report.voucherUses}</b>{" "}
              lượt · Tổng giảm giá: <b>{formatPrice(report.voucherDiscount)}</b>
            </p>
          </section>
          <section className="admin-report-grid">
            <article
              className="admin-report-card admin-revenue-chart-card"
              id="revenue-trend"
            >
              <div className="admin-report-chart-heading">
                <div>
                  <h2>Xu hướng doanh thu</h2>
                  <p>Theo kỳ đã chọn · VNĐ</p>
                </div>
                <button
                  className="admin-export-button"
                  type="button"
                  onClick={exportReport}
                >
                  Xuất biểu đồ
                </button>
              </div>
              <div className="admin-revenue-line-wrap">
                <svg
                  aria-label="Biểu đồ xu hướng doanh thu"
                  className="admin-revenue-line-chart"
                  role="img"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  preserveAspectRatio="none"
                >
                  {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
                    const y =
                      chartPaddingY + (chartHeight - chartPaddingY * 2) * ratio;
                    return (
                      <line
                        key={ratio}
                        x1={chartPaddingX}
                        x2={chartWidth - chartPaddingX}
                        y1={y}
                        y2={y}
                      />
                    );
                  })}
                  <polyline
                    points={revenueChartPoints
                      .map((point) => `${point.x},${point.y}`)
                      .join(" ")}
                  />
                  {revenueChartPoints.map((point) => (
                    <circle cx={point.x} cy={point.y} key={point.label} r="4">
                      <title>{`${point.label}: ${formatPrice(point.value)}`}</title>
                    </circle>
                  ))}
                </svg>
                <div className="admin-revenue-line-axis">
                  {report.dailyRevenue.map((day, index) => (
                    <span key={`${day.label}-${index}`}>{day.label}</span>
                  ))}
                </div>
              </div>
            </article>

            <article className="admin-report-card">
              <p className="admin-eyebrow">Payment methods</p>
              <h2>Phương thức thanh toán.</h2>
              <div className="admin-payment-list">
                {report.payments.map((payment) => (
                  <div key={payment.name}>
                    <span>{payment.name}</span>
                    <i>
                      <b
                        style={{
                          width: `${(payment.value / paymentTotal) * 100}%`,
                        }}
                      />
                    </i>
                    <strong>{formatPrice(payment.value)}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="admin-report-card admin-best-sellers-card">
              <p className="admin-eyebrow">Best sellers</p>
              <h2>Món bán chạy.</h2>
              <div className="admin-best-sellers-list">
                {report.products.map((product, index) => (
                  <div key={product.name}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>
                      {product.name}
                      <i>
                        <b
                          style={{
                            width: `${(product.quantity / productMax) * 100}%`,
                          }}
                        />
                      </i>
                    </p>
                    <strong>{product.quantity} ly</strong>
                  </div>
                ))}
                {!report.products.length && (
                  <p className="admin-empty">Chưa có dữ liệu món bán.</p>
                )}
              </div>
            </article>
          </section>
        </section>
      </main>
    </div>
  );
}

export default AdminReportsPage;
