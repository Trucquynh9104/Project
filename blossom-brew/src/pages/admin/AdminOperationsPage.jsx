import { shiftCashSummary } from "../../../shared/businessRules";
import { useLiveData } from "../../services/useLiveData";
import Modal from "../../components/Modal";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import WorkShell from "../../components/WorkShell";
import { action, store } from "../../services/dataStore";
import AdminListFooter from "../../components/AdminListFooter";
const date = (v) => (v ? new Date(v).toLocaleString("vi-VN") : "—");
const money = (v) => Number(v || 0).toLocaleString("vi-VN") + "đ";
export default function AdminOperationsPage() {
  const location = useLocation();
  const kind = location.pathname.endsWith("shifts")
    ? "shift"
    : location.pathname.endsWith("feedback")
      ? "review"
      : "support";
  const key =
    kind === "shift"
      ? "blossom-cashier-shift-history"
      : kind === "review"
        ? "blossom-reviews"
        : "blossom-support";
  const [items, setItems] = useLiveData(() =>
    JSON.parse(store.getItem(key) || "[]"),
  );
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState("To do");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const titles = {
    shift: "Ca làm việc",
    review: "Đánh giá khách hàng",
    support: "Yêu cầu hỗ trợ",
  };
  const descriptions = {
    shift: "Theo dõi mở ca, đóng ca và chênh lệch tiền mặt.",
    review: "Đánh giá từ các đơn đã hoàn tất.",
    support: "Tiếp nhận và phản hồi yêu cầu của khách hàng.",
  };
  const list = items
    .filter(
      (v) =>
        (filter === "all" ||
          String(kind === "review" ? v.rating : v.status) === filter) &&
        JSON.stringify(v).toLowerCase().includes(keyword.toLowerCase()),
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.openedAt || 0) -
        new Date(a.createdAt || a.openedAt || 0),
    );
  const pages = Math.max(1, Math.ceil(list.length / 6));
  const active = Math.min(page, pages);
  const orders = JSON.parse(store.getItem("blossom-orders") || "[]");
  const cashTotal = (v) => shiftCashSummary(orders, v).net;
  async function save() {
    setBusy(true);
    setError("");
    const r = await action({
      type: "reply",
      kind,
      id: selected.id,
      reply,
      status,
    });
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setItems(JSON.parse(store.getItem(key) || "[]"));
    setSelected(null);
  }
  return (
    <WorkShell title={titles[kind] + "."} description={descriptions[kind]}>
      <div className="brew-toolbar">
        <input
          aria-label="Tìm kiếm"
          placeholder="Tìm kiếm…"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Lọc trạng thái"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Tất cả</option>
          {(kind === "shift"
            ? [
                ["open", "Đang mở"],
                ["closed", "Đã đóng"],
              ]
            : kind === "review"
              ? [
                  ["5", "5 sao"],
                  ["4", "4 sao"],
                  ["3", "3 sao"],
                  ["2", "2 sao"],
                  ["1", "1 sao"],
                ]
              : ["To do", "In-progress", "Done", "Cancelled"].map((s) => [s, s])
          ).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="brew-card brew-table-wrap">
        <table className="brew-table">
          <thead>
            <tr>
              {(kind === "shift"
                ? [
                    "Thu ngân",
                    "Mở ca",
                    "Đóng ca",
                    "Đầu ca",
                    "Tiền thực tế",
                    "Trạng thái",
                    "Chi tiết",
                  ]
                : kind === "review"
                  ? [
                      "Khách hàng",
                      "Đơn hàng",
                      "Điểm",
                      "Thời gian",
                      "Phản hồi",
                      "Chi tiết",
                    ]
                  : [
                      "Khách hàng",
                      "Chủ đề",
                      "Trạng thái",
                      "Thời gian",
                      "Chi tiết",
                    ]
              ).map((v) => (
                <th key={v}>{v}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.slice((active - 1) * 6, active * 6).map((v) => (
              <tr key={v.id}>
                {kind === "shift" ? (
                  <>
                    <td>{v.cashierName}</td>
                    <td>{date(v.openedAt)}</td>
                    <td>{date(v.closedAt)}</td>
                    <td>{money(v.openingCash)}</td>
                    <td>{v.actualCash == null ? "—" : money(v.actualCash)}</td>
                    <td>{v.status === "closed" ? "Đã đóng" : "Đang mở"}</td>
                  </>
                ) : kind === "review" ? (
                  <>
                    <td>{v.customerName}</td>
                    <td>{v.orderId}</td>
                    <td>{v.rating}/5</td>
                    <td>{date(v.createdAt)}</td>
                    <td>{v.reply ? "Đã phản hồi" : "Chưa phản hồi"}</td>
                  </>
                ) : (
                  <>
                    <td>{v.customerName}</td>
                    <td>{v.subject}</td>
                    <td>{v.status}</td>
                    <td>{date(v.createdAt)}</td>
                  </>
                )}
                <td>
                  <button
                    className="brew-button secondary"
                    onClick={() => {
                      setSelected(v);
                      setReply(v.reply || "");
                      setStatus(v.status || "To do");
                      setError("");
                    }}
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && (
          <div className="brew-empty">
            <h2>
              {items.length ? "Không có kết quả phù hợp." : "Chưa có dữ liệu."}
            </h2>
            <p>
              {kind === "shift"
                ? "Ca được ghi nhận khi thu ngân bắt đầu làm việc."
                : kind === "review"
                  ? "Đánh giá xuất hiện sau khi khách gửi từ đơn hoàn tất."
                  : "Yêu cầu khách gửi sẽ hiển thị tại đây."}
            </p>
          </div>
        )}
        <AdminListFooter
          currentPage={active}
          itemLabel={
            kind === "shift" ? "ca" : kind === "review" ? "đánh giá" : "yêu cầu"
          }
          onPageChange={setPage}
          totalItems={list.length}
          totalPages={pages}
        />
      </div>
      {selected && (
        <Modal
          busy={busy}
          title={
            kind === "shift"
              ? "Chi tiết ca"
              : kind === "review"
                ? "Chi tiết đánh giá"
                : selected.subject
          }
          onClose={() => setSelected(null)}
        >
          {kind === "shift" ? (
            <dl className="brew-details">
              <dt>Thu ngân</dt>
              <dd>{selected.cashierName}</dd>
              <dt>Mở ca</dt>
              <dd>{date(selected.openedAt)}</dd>
              <dt>Đóng ca</dt>
              <dd>{date(selected.closedAt)}</dd>
              <dt>Tiền đầu ca</dt>
              <dd>{money(selected.openingCash)}</dd>
              <dt>Thu tiền mặt sau hoàn tiền mô phỏng</dt>
              <dd>{money(cashTotal(selected))}</dd>
              <dt>Tiền mặt dự kiến</dt>
              <dd>
                {money(Number(selected.openingCash) + cashTotal(selected))}
              </dd>
              <dt>Tiền mặt thực tế</dt>
              <dd>
                {selected.actualCash == null ? "—" : money(selected.actualCash)}
              </dd>
              <dt>Chênh lệch</dt>
              <dd>
                {selected.actualCash == null
                  ? "—"
                  : money(
                      selected.actualCash -
                        Number(selected.openingCash) -
                        cashTotal(selected),
                    )}
              </dd>
            </dl>
          ) : (
            <>
              <p>
                <b>{selected.customerName}</b> ·{" "}
                {kind === "review"
                  ? selected.rating + "/5 sao"
                  : selected.status}
              </p>
              <p className="brew-prewrap">
                {kind === "review"
                  ? selected.comment || "Không có nhận xét bằng chữ."
                  : selected.content}
              </p>
              {kind === "support" && (
                <label>
                  Trạng thái
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {["To do", "In-progress", "Done", "Cancelled"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Phản hồi
                <textarea
                  maxLength={2000}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                />
              </label>
              {error && (
                <p role="alert" className="field-error">
                  {error}
                </p>
              )}
              <button disabled={busy} className="brew-button" onClick={save}>
                {busy ? "Đang lưu…" : "Lưu phản hồi"}
              </button>
            </>
          )}
        </Modal>
      )}
    </WorkShell>
  );
}
