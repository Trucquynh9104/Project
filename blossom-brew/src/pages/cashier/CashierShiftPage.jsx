import { shiftCashSummary } from "../../../shared/businessRules";
import { action, store } from "../../services/dataStore";
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import CashierShell from "../../components/CashierShell";
import DateRangeFilter from "../../components/DateRangeFilter";
import { getCurrentUser } from "../../services/authService";
import { notifyShiftCloseRequested } from "../../services/notificationService";
import { isInDateRange } from "../../utils/dateRange";

const ORDERS_KEY = "blossom-orders";
const SHIFT_HISTORY_KEY = "blossom-cashier-shift-history";

function getShiftKey(cashierId) {
  return `blossom-cashier-current-shift-${cashierId}`;
}

function readStorageList(key) {
  try {
    const saved = JSON.parse(store.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function getOrders() {
  return readStorageList(ORDERS_KEY);
}

function getShiftHistory(cashierId) {
  return readStorageList(SHIFT_HISTORY_KEY)
    .filter((item) => item.cashierId === cashierId)
    .sort(
      (first, second) =>
        new Date(second.openedAt || 0) - new Date(first.openedAt || 0),
    );
}

function createShift(user) {
  return {
    id: `shift-${Date.now()}`,
    cashierId: user.id,
    cashierName: user.name,
    name: "Ca sáng",
    status: "pending",
    startedManually: false,
    openedAt: null,
    closedAt: null,
    openingCash: 0,
    actualCash: null,
  };
}

function loadShift(user) {
  const shiftKey = getShiftKey(user.id);

  try {
    const savedShift = JSON.parse(store.getItem(shiftKey) || "null");
    if (
      savedShift?.cashierId === user.id &&
      ["pending", "open", "closed"].includes(savedShift.status)
    ) {
      return savedShift;
    }
  } catch {
    // Dữ liệu bị lỗi thì tạo một ca nháp mới.
  }

  const newShift = createShift(user);
  return newShift;
}

function getMoneyValue(value) {
  const text = String(value).trim();
  return /^\d+(?:[.,]\d{3})*$/.test(text)
    ? Number(text.replace(/[.,]/g, ""))
    : NaN;
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

function formatDateTime(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isCompletedOrder(order) {
  return order.status === "Hoàn tất";
}

function getOrderRecordedAt(order) {
  // Đơn được ghi nhận vào ca tại thời điểm chuyển sang Hoàn tất.
  // Dữ liệu đơn cũ chưa có completedAt vẫn dùng thời điểm tạo đơn để không bị mất báo cáo.
  return order.completedAt || order.createdAt;
}

function CashierShiftPage() {
  const user = getCurrentUser();
  const [shift, setShift] = useState(() => (user ? loadShift(user) : null));
  const [orders, setOrders] = useState(getOrders);
  const [history, setHistory] = useState(() =>
    user ? getShiftHistory(user.id) : [],
  );
  const [openingCash, setOpeningCash] = useState(() =>
    shift?.openingCash ? String(shift.openingCash) : "",
  );
  const [actualCash, setActualCash] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    function refreshShiftData() {
      setOrders(getOrders());
      if (user?.id) setHistory(getShiftHistory(user.id));
    }

    window.addEventListener("focus", refreshShiftData);
    window.addEventListener("storage", refreshShiftData);
    window.addEventListener("blossom-orders-updated", refreshShiftData);
    return () => {
      window.removeEventListener("focus", refreshShiftData);
      window.removeEventListener("storage", refreshShiftData);
      window.removeEventListener("blossom-orders-updated", refreshShiftData);
    };
  }, [user?.id]);

  const shiftOrders = useMemo(() => {
    if (!shift?.openedAt || !user) return [];

    const openedAt = new Date(shift.openedAt).getTime();
    const closedAt = shift.closedAt
      ? new Date(shift.closedAt).getTime()
      : Number.POSITIVE_INFINITY;

    return orders.filter((order) => {
      const recordedAt = new Date(getOrderRecordedAt(order)).getTime();
      const belongsToCurrentCashier = order.cashierId
        ? order.cashierId === user.id
        : order.completedBy === user.id;

      return (
        belongsToCurrentCashier &&
        Number.isFinite(recordedAt) &&
        recordedAt >= openedAt &&
        recordedAt <= closedAt &&
        isInDateRange(getOrderRecordedAt(order), fromDate, toDate)
      );
    });
  }, [orders, shift, user, fromDate, toDate]);

  const completedOrders = useMemo(
    () => shiftOrders.filter(isCompletedOrder),
    [shiftOrders],
  );
  const pendingOrders = useMemo(
    () =>
      shiftOrders.filter(
        (order) => !["Hoàn tất", "Đã hủy"].includes(order.status),
      ).length,
    [shiftOrders],
  );
  const revenue = useMemo(
    () =>
      completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [completedOrders],
  );
  const filteredHistory = useMemo(
    () =>
      history.filter((item) => isInDateRange(item.openedAt, fromDate, toDate)),
    [history, fromDate, toDate],
  );

  if (!user || user.role !== "cashier" || !shift) {
    return <Navigate to="/login" replace />;
  }

  async function startShift() {
    if (busy) return;
    const amount = getMoneyValue(openingCash);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      setMessage("Vui lòng nhập tiền mặt đầu ca nguyên, không âm.");
      return;
    }
    setBusy(true);
    const r = await action({ type: "shift-open", openingCash: amount });
    setBusy(false);
    if (!r.ok) {
      setMessage(r.message);
      return;
    }
    setShift(r.shift);
    setHistory(getShiftHistory(user.id));
    setMessage("Đã bắt đầu ca.");
    setOpeningCash(String(amount));
  }
  async function handleShiftAction() {
    if (busy) return;
    if (shift.status === "closed") {
      setShift(createShift(user));
      setOpeningCash("");
      setActualCash("");
      setMessage("Nhập tiền đầu ca mới.");
      return;
    }
    const amount = getMoneyValue(actualCash);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      setMessage("Nhập số tiền kiểm đếm nguyên, không âm.");
      return;
    }
    if (
      !window.confirm("Xác nhận kết thúc ca và gửi số tiền kiểm đếm cho Admin?")
    )
      return;
    setBusy(true);
    const r = await action({ type: "shift-close", actualCash: amount });
    setBusy(false);
    if (!r.ok) {
      setMessage(r.message);
      return;
    }
    setShift(r.shift);
    setHistory(getShiftHistory(user.id));
    setMessage("Đã đóng ca và gửi Admin.");
    setActualCash("");
  }
  const cash = shiftCashSummary(orders, shift);
  const isShiftOpen = shift.status === "open";
  const isShiftPending = shift.status === "pending";

  return (
    <CashierShell
      active="shift"
      topbarDescription="Theo dõi các đơn hàng và tiền mặt trong ca hiện tại."
      topbarTitle="Ca làm việc."
      user={user}
    >
      <section className="cashier-content cashier-shift-content">
        <DateRangeFilter
          className="cashier-shift-date"
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
        />

        <section className="cashier-shift-summary">
          <article>
            <strong>{String(completedOrders.length).padStart(2, "0")}</strong>
            <span>Đơn hoàn tất trong ca</span>
          </article>
          <article>
            <strong>{formatPrice(revenue)}</strong>
            <span>Doanh thu đơn hoàn tất</span>
          </article>
          <article>
            <strong>{String(pendingOrders).padStart(2, "0")}</strong>
            <span>Đơn đang xử lý</span>
          </article>
        </section>

        <section className="cashier-shift-controls">
          <article>
            <h2>Mở ca</h2>
            <label>
              Tiền mặt đầu ca
              <input
                disabled={!isShiftPending || busy}
                inputMode="numeric"
                placeholder="Nhập tiền đầu ca"
                value={openingCash}
                onChange={(event) => setOpeningCash(event.target.value)}
              />
            </label>
            <button
              className="cashier-outline-button"
              disabled={!isShiftPending || busy}
              type="button"
              onClick={startShift}
            >
              {isShiftPending ? "Bắt đầu ca" : "Ca đang mở"}
            </button>
          </article>

          <article>
            <h2>Đóng ca</h2>
            <label>
              Tiền mặt thực tế
              <input
                disabled={!isShiftOpen || busy}
                inputMode="numeric"
                placeholder="Nhập số tiền kiểm đếm"
                value={actualCash}
                onChange={(event) => setActualCash(event.target.value)}
              />
            </label>
            <button
              className="cashier-shift-action"
              disabled={isShiftPending || busy}
              type="button"
              onClick={handleShiftAction}
            >
              {isShiftOpen
                ? "Kết thúc ca"
                : isShiftPending
                  ? "Chưa mở ca"
                  : "Mở ca mới"}
            </button>
          </article>
        </section>

        <section className="brew-card brew-cash-summary">
          <h2>Đối soát tiền mặt</h2>
          <p>
            Đã thu: <b>{formatPrice(cash.received)}</b> · Hoàn tiền mô phỏng:{" "}
            <b>{formatPrice(cash.refunded)}</b>
          </p>
          <p>
            Dự kiến trong ngăn kéo: <b>{formatPrice(cash.expected)}</b>
            {cash.difference != null && (
              <>
                {" "}
                · Chênh lệch: <b>{formatPrice(cash.difference)}</b>
              </>
            )}
          </p>
          <small>
            Tiền mặt được ghi nhận khi thanh toán, bao gồm đơn đang pha.
          </small>
        </section>
        {message && <p className="cashier-message">{message}</p>}

        <section className="cashier-shift-history">
          <div className="cashier-shift-history-heading">
            <div>
              <p>Lưu vết giao ca</p>
              <h2>Lịch sử ca làm việc</h2>
            </div>
            <span>{filteredHistory.length} ca</span>
          </div>

          {filteredHistory.length ? (
            <div className="cashier-shift-history-table">
              <div className="cashier-shift-history-row cashier-shift-history-labels">
                <span>Mở ca lúc</span>
                <span>Tiền đầu ca</span>
                <span>Đóng ca lúc</span>
                <span>Tiền thực tế</span>
                <span>Trạng thái</span>
              </div>
              {filteredHistory.map((item) => (
                <div className="cashier-shift-history-row" key={item.id}>
                  <span>{formatDateTime(item.openedAt)}</span>
                  <b>{formatPrice(item.openingCash)}</b>
                  <span>{formatDateTime(item.closedAt)}</span>
                  <b>{item.closedAt ? formatPrice(item.actualCash) : "—"}</b>
                  <i className={item.status === "closed" ? "closed" : "open"}>
                    {item.status === "closed" ? "Đã đóng" : "Đang mở"}
                  </i>
                </div>
              ))}
            </div>
          ) : (
            <p className="cashier-shift-history-empty">
              Chưa có lịch sử ca làm việc.
            </p>
          )}
        </section>
      </section>
    </CashierShell>
  );
}

export default CashierShiftPage;
