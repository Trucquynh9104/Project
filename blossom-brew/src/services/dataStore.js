const cache = new Map();
const drafts = new Set([
  "blossom-cart",
  "blossom-selected-voucher",
  "blossom-checkout-order",
]);
let pending = new Map(),
  timer,
  tail = Promise.resolve(),
  user = null,
  authEpoch = 0,
  refreshId = 0,
  dataVersion = 0;
const sessionKey = "brew-session-token";
let sessionToken = "";
try {
  sessionToken = sessionStorage.getItem(sessionKey) || "";
} catch {}
function setSessionToken(token) {
  sessionToken = token || "";
  try {
    if (sessionToken) sessionStorage.setItem(sessionKey, sessionToken);
    else sessionStorage.removeItem(sessionKey);
  } catch {}
}
export function subscribeUser(listener) {
  window.addEventListener("brew-data-updated", listener);
  return () => window.removeEventListener("brew-data-updated", listener);
}
export function getUser() {
  return user;
}
export function getDataVersion() {
  return dataVersion;
}
function signal(message = "", kind = "") {
  window.dispatchEvent(
    new CustomEvent("brew-save-state", { detail: { message, kind } }),
  );
}
function hydrate(result) {
  dataVersion++;
  user = result.user || null;
  cache.clear();
  for (const [k, v] of Object.entries(result.data || {}))
    cache.set(k, JSON.stringify(v));
  cache.set("blossom-brew-current-user", JSON.stringify(user));
  cache.set("blossom-brew-notifications-seeded", "true");
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("blossom-orders-updated"));
  window.dispatchEvent(new Event("blossom-notifications-updated"));
  window.dispatchEvent(new Event("brew-data-updated"));
}
export async function request(path, body) {
  try {
    const r = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      credentials: "same-origin",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(sessionToken ? { "X-Brew-Session": sessionToken } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await r.json();
    if (!r.ok)
      return { ok: false, message: result.message || "Không thể lưu dữ liệu." };
    return result;
  } catch {
    return {
      ok: false,
      message:
        "Không thể kết nối. Dữ liệu nhập vẫn được giữ, vui lòng thử lại.",
    };
  }
}
export async function bootstrap() {
  const epoch = authEpoch,
    id = ++refreshId;
  const r = await request("/api/bootstrap");
  if (r.ok === false) throw new Error(r.message);
  if (epoch === authEpoch && id === refreshId) {
    if (!r.user) setSessionToken("");
    hydrate(r);
  }
  return r;
}
export async function action(body) {
  if (!(await store.flush()))
    return { ok: false, message: "Chưa lưu được thay đổi trước đó." };
  signal("Đang lưu…", "saving");
  const r = await request("/api/action", body);
  if (r.data) hydrate(r);
  if (r.ok) {
    signal("Đã lưu", "success");
  } else signal(r.message, "error");
  return r;
}
export async function authenticate(path, body) {
  const epoch = ++authEpoch;
  const r = await request(path, body);
  if (r.ok && epoch === authEpoch) {
    authEpoch++;
    pending.clear();
    clearTimeout(timer);
    setSessionToken(r.sessionToken);
    hydrate(r);
  }
  return r;
}
const draftKey = (key) => `brew-draft:${user?.id || "guest"}:${key}`;
export const store = {
  getItem(key) {
    if (drafts.has(key)) return sessionStorage.getItem(draftKey(key));
    return cache.get(key) ?? null;
  },
  setItem(key, value) {
    if (drafts.has(key)) {
      sessionStorage.setItem(draftKey(key), value);
      return;
    }
    if (key === "blossom-brew-current-user") {
      cache.set(key, value);
      return;
    }
    const old = cache.get(key);
    if (old === value) return;
    cache.set(key, value);
    if (key === "blossom-brew-notifications-seeded") return;
    const before =
      pending.get(key)?.before ??
      (old
        ? JSON.parse(old)
        : key.startsWith("blossom-cashier-current-shift-")
          ? null
          : []);
    pending.set(key, { key, before, after: JSON.parse(value) });
    clearTimeout(timer);
    timer = setTimeout(() => store.flush(), 0);
  },
  removeItem(key) {
    if (drafts.has(key)) {
      sessionStorage.removeItem(draftKey(key));
      return;
    }
    cache.delete(key);
  },
  async flush() {
    clearTimeout(timer);
    if (!pending.size) {
      await tail;
      return true;
    }
    const changes = [...pending.values()];
    pending.clear();
    const run = async () => {
      signal("Đang lưu…", "saving");
      const r = await request("/api/patch", { changes });
      if (r.ok) {
        hydrate(r);
        signal("Đã lưu", "success");
        return true;
      }
      signal(r.message, "error");
      const restored = await request("/api/bootstrap");
      if (restored.data) hydrate(restored);
      return false;
    };
    const result = tail.then(run);
    tail = result.catch(() => {});
    return result;
  },
  async refresh() {
    await store.flush();
    try {
      await bootstrap();
    } catch (e) {
      signal(e.message, "error");
    }
  },
  async logout() {
    await store.flush();
    authEpoch++;
    const r = await request("/api/logout", {});
    if (r.ok) {
      authEpoch++;
      setSessionToken("");
      await bootstrap();
    }
    return r;
  },
};
window.addEventListener("focus", () => store.refresh());
