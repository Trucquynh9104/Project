import InvoiceModal from "../../components/InvoiceModal";
import { action, store } from "../../services/dataStore";
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import CashierShell from "../../components/CashierShell";
import DateRangeFilter from "../../components/DateRangeFilter";
import { addMemberPoints, getCurrentUser } from "../../services/authService";
import {
  notifyOrderStatusChanged,
  notifyPointsAwarded,
} from "../../services/notificationService";
import {
  getNextOrderStatuses,
  saveOrderStatus,
} from "../../services/orderService";
import { isInDateRange } from "../../utils/dateRange";

const statusFilters = [
  "Tất cả trạng thái",
  "Chờ xác nhận",
  "Chờ pha",
  "Đang pha",
  "Hoàn tất",
  "Đã hủy",
];

const ITEMS_PER_PAGE = 8;

function ListFooter({ currentPage, onPageChange, totalItems, totalPages }) {
  return (
    <div className="cashier-list-footer">
      <span>
        Tổng số đơn hàng <b>{totalItems}</b>
      </span>
      <div>
        <button
          aria-label="Trang trước"
          disabled={currentPage === 1}
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          ‹
        </button>
        <span>
          Trang {currentPage}/{totalPages}
        </span>
        <button
          aria-label="Trang sau"
          disabled={currentPage === totalPages}
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          ›
        </button>
      </div>
    </div>
  );
}

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("vi-VN")}đ`;
}

function getOrderGroup(status) {
  if (status === "Hoàn tất") return "completed";
  if (status === "Đã hủy") return "cancelled";
  if (status === "Chờ xác nhận") return "incomplete";
  return "processing";
}

function CustomerName({ order }) {
  return (
    <div>
      <strong>
        {order.member?.name || order.receiver || "Khách vãng lai"}
      </strong>
      <small>{order.product}</small>
    </div>
  );
}

function CashierOrdersPage() {
  const user = getCurrentUser();
  const [filter, setFilter] = useState("Tất cả trạng thái");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [invoice, setInvoice] = useState(null);
  const [orders, setOrders] = useState(() =>
    JSON.parse(store.getItem("blossom-orders") || "[]"),
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        filter === "Tất cả trạng thái" || order.status === filter;
      return matchesStatus && isInDateRange(order.createdAt, fromDate, toDate);
    });
  }, [orders, filter, fromDate, toDate]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ITEMS_PER_PAGE),
  );
  const activePage = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE,
  );

  if (!user || user.role !== "cashier") {
    return <Navigate to="/login" replace />;
  }

  async function updateOrderStatus(id, status) {
    const result = await action({
      type: "order-status",
      orderId: id,
      status,
      cancellationReason,
    });
    if (!result.ok) {
      setStatusMessage(result.message);
      return;
    }
    setOrders(JSON.parse(store.getItem("blossom-orders") || "[]"));

    setNextStatus("");
    setCancellationReason("");
    setStatusMessage("Đã cập nhật trạng thái đơn hàng.");
  }

  function exportOrders() {
    const rows = filteredOrders.map((order) => [
      order.id,
      order.member?.name || order.receiver || "Khách vãng lai",
      order.product || "",
      order.time || "",
      order.status || "",
      Number(order.total || 0),
    ]);
    const csv = [
      [
        "Mã đơn",
        "Khách hàng",
        "Sản phẩm",
        "Thời gian",
        "Trạng thái",
        "Tổng tiền",
      ],
      ...rows,
    ]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "don-hang-tai-quay.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <CashierShell
      active="orders"
      topbarDescription="Theo dõi và cập nhật trạng thái đơn được xử lý tại cửa hàng."
      topbarTitle="Quản lý đơn hàng."
      user={user}
    >
      <section className="cashier-content cashier-list-content">
        <div className="cashier-order-toolbar">
          <DateRangeFilter
            className="cashier-order-date"
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={(value) => {
              setFromDate(value);
              setCurrentPage(1);
            }}
            onToDateChange={(value) => {
              setToDate(value);
              setCurrentPage(1);
            }}
          />
          <div>
            <button
              className="cashier-outline-button"
              type="button"
              onClick={exportOrders}
            >
              Xuất file
            </button>
            <select
              aria-label="Lọc trạng thái đơn hàng"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              {statusFilters.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        <section className="cashier-orders-table">
          <div className="cashier-orders-row cashier-orders-header">
            <span>Mã đơn</span>
            <span>Khách hàng / sản phẩm</span>
            <span>Thời gian</span>
            <span>Số tiền</span>
            <span>Trạng thái</span>
            <span>Thao tác</span>
          </div>

          {paginatedOrders.map((order) => (
            <div key={order.id} className="cashier-order-record">
              <div className="cashier-orders-row">
                <strong>{order.id}</strong>
                <CustomerName order={order} />
                <span>
                  {order.time ||
                    new Date(order.createdAt).toLocaleString("vi-VN")}
                </span>
                <strong className="cashier-order-total">
                  {formatPrice(order.total)}
                </strong>
                <span
                  className={`cashier-status-text ${getOrderGroup(order.status)}`}
                >
                  {order.status}
                </span>
                <button
                  className="cashier-detail-button"
                  type="button"
                  onClick={() => {
                    const isClosing = expandedOrderId === order.id;
                    setExpandedOrderId(isClosing ? null : order.id);
                    setNextStatus("");
                    setCancellationReason("");
                    setStatusMessage("");
                  }}
                >
                  {expandedOrderId === order.id ? "Đóng" : "Chi tiết"}
                </button>
              </div>

              {expandedOrderId === order.id && (
                <div className="cashier-order-detail">
                  <div>
                    <span>Khách nhận</span>
                    <strong>{order.receiver || "Khách vãng lai"}</strong>
                  </div>
                  <div>
                    <span>Thanh toán</span>
                    <strong>
                      {{
                        cash: "Tiền mặt",
                        card: "Thẻ",
                        qr: "QR",
                        wallet: "Ví điện tử",
                      }[order.paymentMethod] || order.paymentMethod}
                    </strong>
                  </div>
                  <div>
                    <span>Tổng thanh toán</span>
                    <strong>{formatPrice(order.total)}</strong>
                  </div>
                  {order.earnedPoints > 0 && (
                    <div>
                      <span>Điểm tích lũy</span>
                      <strong>+{order.earnedPoints} điểm</strong>
                    </div>
                  )}
                  <button
                    className="brew-button secondary"
                    type="button"
                    onClick={() => setInvoice(order)}
                  >
                    In hóa đơn
                  </button>
                  <div className="cashier-order-detail-items">
                    {order.items?.map((item) => (
                      <p key={item.cartId || item.id || item.productId}>
                        <strong>
                          {item.name} ×{item.quantity}
                        </strong>
                        <span>
                          Size {item.size} · {item.sugar} đường · {item.ice}
                          {item.toppings?.length > 0 &&
                            ` · ${item.toppings.join(", ")}`}
                          {item.note && ` · Ghi chú: ${item.note}`}
                        </span>
                      </p>
                    ))}
                  </div>
                  {order.status === "Đã hủy" && (
                    <p className="cashier-cancellation-note">
                      <b>Lý do hủy:</b>{" "}
                      {order.cancellationReason ||
                        "Chưa có lý do được ghi nhận."}
                    </p>
                  )}
                  {getNextOrderStatuses(order.status, order.paymentStatus)
                    .length > 0 && (
                    <div className="cashier-order-status-action">
                      <p>Cập nhật trạng thái đơn hàng</p>
                      <div className="cashier-status-buttons">
                        {getNextOrderStatuses(
                          order.status,
                          order.paymentStatus,
                        ).map((status) => (
                          <button
                            className={
                              status === "Đã hủy"
                                ? "cashier-cancel-status-button"
                                : "cashier-next-status-button"
                            }
                            key={status}
                            type="button"
                            onClick={() => {
                              setStatusMessage("");
                              if (status === "Đã hủy") setNextStatus("Đã hủy");
                              else updateOrderStatus(order.id, status);
                            }}
                          >
                            {status === "Đang pha"
                              ? "Chuyển sang Đang pha chế"
                              : `Chuyển sang ${status}`}
                          </button>
                        ))}
                      </div>
                      {nextStatus === "Đã hủy" && (
                        <label className="cashier-cancellation-field">
                          Lý do hủy đơn
                          <textarea
                            value={cancellationReason}
                            onChange={(event) =>
                              setCancellationReason(event.target.value)
                            }
                            placeholder="Nhập lý do khách/nhân viên hủy hoặc đổi món..."
                          />
                        </label>
                      )}
                      {nextStatus === "Đã hủy" && (
                        <button
                          className="cashier-shift-action"
                          type="button"
                          onClick={() => updateOrderStatus(order.id, "Đã hủy")}
                        >
                          Xác nhận hủy đơn
                        </button>
                      )}
                      {statusMessage && (
                        <p className="cashier-status-message">
                          {statusMessage}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {!filteredOrders.length && (
            <p className="cashier-orders-empty">Chưa có đơn hàng phù hợp.</p>
          )}

          <ListFooter
            currentPage={activePage}
            totalItems={filteredOrders.length}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </section>
      </section>
      {invoice && (
        <InvoiceModal order={invoice} onClose={() => setInvoice(null)} />
      )}
    </CashierShell>
  );
}

export default CashierOrdersPage;
