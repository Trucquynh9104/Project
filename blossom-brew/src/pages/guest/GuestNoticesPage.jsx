import { Link } from "react-router-dom";
import { store } from "../../services/dataStore";
export default function GuestNoticesPage() {
  const items = JSON.parse(
    store.getItem("blossom-brew-notifications") || "[]",
  ).filter((v) => v.recipientRole === "guest");
  return (
    <main className="brew-public-notices">
      <Link className="auth-brand" to="/">
        <span>B</span>Blossom Brew
      </Link>
      <h1>Thông báo từ quán.</h1>
      {items.length ? (
        items.map((v) => (
          <article key={v.id} className="brew-card">
            <h2>{v.title}</h2>
            <p>{v.content}</p>
            <small>{new Date(v.createdAt).toLocaleDateString("vi-VN")}</small>
          </article>
        ))
      ) : (
        <p>Chưa có thông báo công khai.</p>
      )}
      <Link className="brew-button" to="/">
        Xem menu
      </Link>
    </main>
  );
}
