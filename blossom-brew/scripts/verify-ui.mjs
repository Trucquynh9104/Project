import { env, call, admin } from "./verify.mjs";
import { createServer } from "vite";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const events = new EventTarget();
globalThis.window = {
  addEventListener: events.addEventListener.bind(events),
  removeEventListener: events.removeEventListener.bind(events),
  dispatchEvent: events.dispatchEvent.bind(events),
  setTimeout,
  clearTimeout,
  confirm: () => true,
};
globalThis.document = { modelContext: null };
const drafts = new Map();
globalThis.sessionStorage = {
  getItem: (k) => drafts.get(k) || null,
  setItem: (k, v) => drafts.set(k, v),
  removeItem: (k) => drafts.delete(k),
};
let currentCookie = "";
globalThis.fetch = async (url, opts = {}) => {
  const res = await (
    await import("../server/worker.js")
  ).default.fetch(
    new Request("https://brew.test" + url, {
      ...opts,
      headers: { ...opts.headers, Cookie: currentCookie },
    }),
    env,
  );
  return res;
};
const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { bootstrap } = await vite.ssrLoadModule("/src/services/dataStore.js");
  const { default: App } = await vite.ssrLoadModule("/src/App.jsx");
  const source = readFileSync("src/App.jsx", "utf8");
  const allRoutes = [...source.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((p) => p !== "*");
  const cases = [
    ["guest", ""],
    [
      "customer",
      (
        await call("/api/login", {
          email: "customer@blossombrew.vn",
          password: "Customer123",
        })
      ).cookie,
    ],
    ["admin", admin],
  ];
  // Restore the cashier for UI role coverage after the suspension backend test.
  const r = await call("/api/bootstrap", undefined, admin);
  const users = r.data.data["blossom-brew-users"];
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
  cases.push([
    "cashier",
    (
      await call("/api/login", {
        email: "cashier@blossombrew.vn",
        password: "Cashier123",
      })
    ).cookie,
  ]);
  let count = 0;
  for (const [role, cookie] of cases) {
    currentCookie = cookie;
    await bootstrap();
    for (const route of allRoutes) {
      const html = renderToString(
        React.createElement(
          MemoryRouter,
          { initialEntries: [route] },
          React.createElement(App),
        ),
      );
      if (
        route.startsWith("/" + role) ||
        !/^\/(admin|customer|cashier)/.test(route)
      ) {
        if (!["/login", "/register"].includes(route) || role === "guest")
          assert(html.length > 100, route + " blank");
        assert(
          !html.includes("Bạn không có quyền truy cập màn này."),
          role + route,
        );
      } else if (role !== "guest") {
        assert(
          html.includes("Bạn không có quyền truy cập màn này."),
          role + route + " unprotected",
        );
      }
      count++;
    }
  }
  function files(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((f) =>
      f.isDirectory()
        ? files(path.join(dir, f.name))
        : [path.join(dir, f.name)],
    );
  }
  for (const file of files("src")) {
    if (!file.endsWith(".jsx")) continue;
    const t = readFileSync(file, "utf8");
    for (const m of t.matchAll(
      /(?:to:\s*|to=|navigate\()(['"])(\/(?:admin|customer|cashier)[^'"?]*)\1/g,
    )) {
      assert(allRoutes.includes(m[2]), file + " links to missing " + m[2]);
      count++;
    }
  }
  console.log(
    JSON.stringify({
      render_and_navigation_checks: count,
      routes: allRoutes.length,
      roles: 4,
      status: "passed",
      browser_qa: "unavailable",
    }),
  );
} finally {
  await vite.close();
}
