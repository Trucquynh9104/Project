import { useLiveData } from "../../services/useLiveData";
import { useState } from "react";
import WorkShell from "../../components/WorkShell";
import { action, store } from "../../services/dataStore";
export default function CustomerSupportPage() {
  const [items, setItems] = useLiveData(() =>
    JSON.parse(store.getItem("blossom-support") || "[]"),
  );
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (!window.confirm("Yêu cầu đã gửi không thể thu hồi. Xác nhận gửi?"))
      return;
    setBusy(true);
    const r = await action({ type: "support-add", subject, content });
    setBusy(false);
    setMessage(r.ok ? "Yêu cầu đã được gửi." : r.message);
    if (r.ok) {
      setItems(JSON.parse(store.getItem("blossom-support") || "[]"));
      setSubject("");
      setContent("");
    }
  }
  return (
    <WorkShell
      title="Hỗ trợ."
      description="Gửi yêu cầu và theo dõi phản hồi từ cửa hàng."
    >
      <div className="brew-split">
        <form className="brew-card brew-form" onSubmit={submit}>
          <h2>Gửi yêu cầu</h2>
          <label>
            Chủ đề *
            <input
              required
              maxLength={150}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label>
            Nội dung *
            <textarea
              required
              maxLength={2000}
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </label>
          <p className="brew-hint">Yêu cầu đã gửi không thể thu hồi.</p>
          <button
            disabled={busy || !subject.trim() || !content.trim()}
            className="brew-button"
          >
            {busy ? "Đang gửi…" : "Gửi yêu cầu"}
          </button>
          {message && <p role="status">{message}</p>}
        </form>
        <section className="brew-card">
          <h2>Yêu cầu của bạn</h2>
          {!items.length ? (
            <p className="brew-empty">Chưa có yêu cầu hỗ trợ.</p>
          ) : (
            items.map((v) => (
              <article className="brew-request" key={v.id}>
                <b>{v.subject}</b>
                <span>{v.status}</span>
                <p className="brew-prewrap">{v.content}</p>
                <small>{new Date(v.createdAt).toLocaleString("vi-VN")}</small>
                {v.reply && (
                  <div className="brew-response">
                    <b>Blossom Brew phản hồi</b>
                    <p>{v.reply}</p>
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      </div>
    </WorkShell>
  );
}
