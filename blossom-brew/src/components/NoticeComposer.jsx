import { useState } from "react";
import { action, store } from "../services/dataStore";
import { useLiveData } from "../services/useLiveData";
import AdminListFooter from "./AdminListFooter";
export default function NoticeComposer() {
  const [open, setOpen] = useState(false),
    [history, setHistory] = useState(false),
    [page, setPage] = useState(1);
  const [title, setTitle] = useState(""),
    [content, setContent] = useState(""),
    [role, setRole] = useState("customer"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [notices] = useLiveData(() =>
    JSON.parse(store.getItem("blossom-brew-notifications") || "[]").filter(
      (n) => n.createdBy,
    ),
  );
  const pages = Math.max(1, Math.ceil(notices.length / 4)),
    active = Math.min(page, pages);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const r = await action({ type: "publish-notice", role, title, content });
    setBusy(false);
    if (r.ok) {
      setOpen(false);
      setTitle("");
      setContent("");
      setHistory(true);
      setPage(1);
    } else setError(r.message);
  }
  return (
    <div className="brew-composer">
      <div className="brew-toolbar">
        <button
          className="brew-button"
          disabled={busy}
          onClick={() => setOpen(!open)}
        >
          {open ? "Đóng" : "Tạo thông báo"}
        </button>
        <button
          className="brew-button secondary"
          onClick={() => setHistory(!history)}
        >
          {history ? "Ẩn thông báo đã gửi" : "Thông báo đã gửi"}
        </button>
      </div>
      {open && (
        <form className="brew-card brew-form" onSubmit={submit}>
          <label>
            Đối tượng
            <select
              disabled={busy}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="guest">Guest trong website riêng tư</option>
              <option value="customer">Khách hàng</option>
              <option value="cashier">Thu ngân</option>
            </select>
          </label>
          <label>
            Tiêu đề *
            <input
              required
              disabled={busy}
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Nội dung *
            <textarea
              required
              disabled={busy}
              rows={3}
              maxLength={2000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="brew-button"
            disabled={busy || !title.trim() || !content.trim()}
          >
            {busy ? "Đang gửi…" : "Lưu thông báo"}
          </button>
        </form>
      )}
      {history && (
        <section className="brew-card">
          <h2>Thông báo đã gửi</h2>
          {!notices.length && <p>Chưa gửi thông báo nào.</p>}
          {notices.slice((active - 1) * 4, active * 4).map((n) => (
            <article className="brew-request" key={n.id}>
              <b>{n.title}</b>
              <small>
                {
                  { guest: "Guest", customer: "Customer", cashier: "Cashier" }[
                    n.recipientRole
                  ]
                }{" "}
                ·{" "}
                {new Date(n.createdAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </small>
              <p className="brew-prewrap">{n.content}</p>
            </article>
          ))}
          <AdminListFooter
            currentPage={active}
            onPageChange={setPage}
            itemLabel="thông báo đã gửi"
            totalItems={notices.length}
            totalPages={pages}
          />
        </section>
      )}
    </div>
  );
}
