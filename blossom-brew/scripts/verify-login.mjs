// Exercise the mounted login form, router, and real Worker with cookies blocked.
import { env, call, admin } from "./verify.mjs";
import worker from "../server/worker.js";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import React, { act } from "react";
import assert from "node:assert/strict";

const dom = new JSDOM('<div id="root"></div>', {
  url: "https://brew.test/login",
});
for (const key of [
  "window",
  "document",
  "Event",
  "CustomEvent",
  "HTMLElement",
  "HTMLInputElement",
  "sessionStorage",
])
  globalThis[key] = key === "window" ? dom.window : dom.window[key];
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import("react-dom/client");
const { BrowserRouter } = await import("react-router-dom");
let holdBootstrap = false,
  held = [],
  loginRequests = 0;
const sessionHeaders = [];
globalThis.fetch = async (url, opts = {}) => {
  if (url === "/api/login") loginRequests++;
  const headers = new Headers(opts.headers);
  // Deliberately discard Set-Cookie: an embedded browser can block cookie storage.
  assert(!headers.has("cookie"));
  if (headers.has("X-Brew-Session"))
    sessionHeaders.push(headers.get("X-Brew-Session"));
  const response = await worker.fetch(
    new Request("https://brew.test" + url, { ...opts, headers }),
    env,
  );
  if (url === "/api/bootstrap" && holdBootstrap)
    return await new Promise((resolve) => held.push(() => resolve(response)));
  return response;
};
const users = (await call("/api/bootstrap", undefined, admin)).data.data[
  "blossom-brew-users"
];
await call(
  "/api/patch",
  {
    changes: [
      {
        key: "blossom-brew-users",
        before: users,
        after: users.map((u) =>
          u.role === "cashier" ? { ...u, active: true } : u,
        ),
      },
    ],
  },
  admin,
);
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
let root;
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 120));
  });
}
async function fill(name, value) {
  await act(async () => {
    const input = document.querySelector(`input[name="${name}"]`);
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit() {
  await act(async () => {
    document
      .querySelector("form")
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await settle();
}
async function go(path) {
  await act(async () => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new dom.window.PopStateEvent("popstate"));
  });
  await settle();
}
let checks = 0;
const check = (condition, message) => {
  assert(condition, message);
  checks++;
};
try {
  const { bootstrap, store, getUser } = await vite.ssrLoadModule(
    "/src/services/dataStore.js",
  );
  const { default: App } = await vite.ssrLoadModule("/src/App.jsx");
  for (const [role, password] of [
    ["customer", "Customer123"],
    ["cashier", "Cashier123"],
    ["admin", "Admin123"],
  ]) {
    window.history.replaceState({}, "", "/login");
    await bootstrap();
    holdBootstrap = true;
    held = [];
    root = createRoot(document.getElementById("root"));
    await act(async () => {
      root.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(BrowserRouter, null, React.createElement(App)),
        ),
      );
    });
    await settle();
    check(held.length >= 2, "StrictMode starts overlapping guest refreshes");
    await fill("email", role + "@blossombrew.vn");
    await fill("password", "Wrong123");
    await act(async () => {
      held.pop()();
    });
    await settle();
    check(
      document.querySelector('input[name="email"]').value ===
        role + "@blossombrew.vn",
      "Background refresh must preserve form fields",
    );
    await submit();
    check(
      window.location.pathname === "/login",
      "Wrong password stays on login",
    );
    check(
      document.body.textContent.includes("Email hoặc mật khẩu chưa đúng"),
      "Wrong password explains the failure",
    );
    check(
      !sessionStorage.getItem("brew-session-token"),
      "Failed login stores no credential",
    );
    await fill("password", password);
    holdBootstrap = false;
    const before = loginRequests;
    await submit();
    check(loginRequests === before + 1, "Exactly one login request per submit");
    check(
      window.location.pathname === "/" + role,
      "Successful login opens " + role + " home",
    );
    check(
      getUser()?.role === role,
      "The server-authorized role remains in the store",
    );
    check(
      !document.body.textContent.includes("Tài khoản thử nghiệm"),
      "The login form unmounts after success",
    );
    check(
      !!sessionStorage.getItem("brew-session-token"),
      "Cookie-blocked login retains a tab session",
    );
    await act(async () => {
      for (const resolve of held) resolve();
      held = [];
    });
    await settle();
    check(
      getUser()?.role === role,
      "A late guest response cannot erase " + role + " login",
    );
    check(
      window.location.pathname === "/" + role,
      "Late response cannot redirect back to login",
    );
    await act(async () => {
      await store.refresh();
    });
    await settle();
    check(
      getUser()?.role === role,
      "Fresh bootstrap authenticates without cookies",
    );
    await go("/login");
    check(
      window.location.pathname === "/" + role,
      "An authenticated login visit redirects to the role home",
    );
    await go(role === "admin" ? "/customer/menu" : "/admin");
    check(
      document.body.textContent.includes(
        "Bạn không có quyền truy cập màn này.",
      ),
      "Cross-role route is denied",
    );
    const token = sessionStorage.getItem("brew-session-token");
    const reload = await worker.fetch(
      new Request("https://brew.test/api/bootstrap", {
        headers: { "X-Brew-Session": token },
      }),
      env,
    );
    check(
      (await reload.json()).user?.role === role,
      "Stored credential can restore a reloaded tab",
    );
    await act(async () => {
      await store.logout();
    });
    await settle();
    check(
      window.location.pathname === "/login",
      "Logout returns protected route to login",
    );
    check(
      !sessionStorage.getItem("brew-session-token"),
      "Logout clears tab credential",
    );
    const revoked = await worker.fetch(
      new Request("https://brew.test/api/bootstrap", {
        headers: { "X-Brew-Session": token },
      }),
      env,
    );
    check(
      (await revoked.json()).user === null,
      "Logout revokes the server session",
    );
    await act(async () => root.unmount());
    root = null;
  }
  const forged = await worker.fetch(
    new Request("https://brew.test/api/action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Brew-Session": "forged-admin",
      },
      body: JSON.stringify({
        type: "publish-notice",
        role: "guest",
        title: "x",
        content: "x",
      }),
    }),
    env,
  );
  check(
    forged.status === 403,
    "A forged browser credential grants no permissions",
  );
  check(
    sessionHeaders.length > 0,
    "Follow-up requests use the verified session credential",
  );
  console.log(
    JSON.stringify({
      mounted_login_checks: checks,
      roles: 3,
      cookies: "blocked",
      late_responses: "covered",
      status: "passed",
    }),
  );
} finally {
  if (root) await act(async () => root.unmount());
  await vite.close();
  dom.window.close();
}
