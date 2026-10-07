import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createLocalRuntime } from "../server/local-runtime.mjs";
import worker from "../server/worker.js";
import { evaluateVoucher, shiftCashSummary } from "../shared/businessRules.js";

const directory = await mkdtemp(path.join(os.tmpdir(), "blossom-workflows-"));
let runtime = await createLocalRuntime(directory),
  count = 0;
const check = (value, message) => {
  assert(value, message);
  count++;
};
async function call(route, body, token = "") {
  const response = await worker.fetch(
    new Request("https://brew.test" + route, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://brew.test",
        ...(token ? { "X-Brew-Session": token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    runtime.env,
  );
  return { status: response.status, ...(await response.json()) };
}
const login = async (role, password) =>
  (await call("/api/login", { email: role + "@blossombrew.vn", password }))
    .sessionToken;
let vite, root, dom;
try {
  const admin = await login("admin", "Admin123"),
    customer = await login("customer", "Customer123"),
    cashier = await login("cashier", "Cashier123");
  let state = await call("/api/bootstrap", undefined, admin);
  const vouchers = state.data["blossom-vouchers"];
  const voucher = {
    id: "audit-voucher",
    code: "AUDIT-26_TEST",
    type: "fixed",
    value: 5000,
    minOrder: 1000,
    maxDiscount: 0,
    usageLimit: 1,
    usedCount: 0,
    active: true,
    startDate: "2026-01-01",
    expiry: "2026-12-31",
  };
  check(
    (
      await call(
        "/api/patch",
        {
          changes: [
            {
              key: "blossom-vouchers",
              before: vouchers,
              after: [...vouchers, voucher],
            },
          ],
        },
        admin,
      )
    ).ok,
    "Admin creates a voucher with dash/underscore",
  );
  const at = Date.parse("2026-10-07T00:15:00+07:00");
  check(
    evaluateVoucher({ ...voucher, startDate: "2026-10-07" }, 37000, null, at)
      .ok,
    "Voucher start uses Vietnam date",
  );
  check(
    evaluateVoucher(
      { ...voucher, expiry: "2026-10-07" },
      37000,
      null,
      Date.parse("2026-10-07T23:59:59+07:00"),
    ).ok,
    "Expiry includes the entire final day",
  );
  check(
    !evaluateVoucher({ ...voucher, usedCount: 1 }, 37000, null, at).ok,
    "Usage cap applies to the same preview rules",
  );
  const payload = {
    type: "create-order",
    requestId: crypto.randomUUID(),
    paymentResult: "pending",
    items: [
      { productId: "1", size: "S", quantity: 1 },
      { productId: "2", size: "M", quantity: 1 },
    ],
    orderType: "pickup",
    paymentMethod: "qr",
    receiver: "Khách hàng demo",
    deliveryInfo: { phone: "0901234567" },
    voucherCode: voucher.code,
  };
  let r = await call("/api/action", payload, customer),
    order = r.order;
  check(
    r.ok && order.paymentStatus === "pending" && !order.paidAt,
    "Persist a pending payment",
  );
  check(order.total === 84000, "Price and discount come from the server");
  check(
    (await call("/api/bootstrap", undefined, admin)).data[
      "blossom-vouchers"
    ].find((v) => v.id === voucher.id).usedCount === 0,
    "Pending order does not consume voucher",
  );
  check(
    !(await call("/api/bootstrap", undefined, cashier)).data[
      "blossom-orders"
    ].some((v) => v.id === order.id),
    "Unpaid order never enters cashier preparation queue",
  );
  check(
    (
      await call(
        "/api/action",
        { type: "order-status", orderId: order.id, status: "Chờ pha" },
        admin,
      )
    ).status === 409,
    "Admin cannot fulfill unpaid orders",
  );
  const other = await call("/api/register", {
    name: "Khách thứ hai",
    email: "second@brew.test",
    password: "Customer234",
  });
  check(
    (
      await call(
        "/api/action",
        {
          type: "pay-order",
          orderId: order.id,
          paymentMethod: "qr",
          paymentResult: "success",
          expectedTotal: 84000,
        },
        other.sessionToken,
      )
    ).status === 404,
    "Payment is owner-only",
  );
  const pay = {
    type: "pay-order",
    orderId: order.id,
    paymentMethod: "card",
    paymentResult: "failed",
    expectedTotal: 84000,
  };
  r = await call("/api/action", pay, customer);
  check(
    !r.ok && r.order.paymentStatus === "failed",
    "Failure is retained on the same order",
  );
  check(
    (await call("/api/bootstrap", undefined, customer)).user.points === 60,
    "Failed payment gives no points",
  );
  r = await call("/api/action", { ...pay, paymentResult: "success" }, customer);
  check(
    r.ok && r.order.id === order.id && r.order.paymentStatus === "paid",
    "Retry pays the existing order",
  );
  check(
    (await call("/api/action", { ...pay, paymentResult: "success" }, customer))
      .ok,
    "Repeated payment response is idempotent",
  );
  check(
    (await call("/api/bootstrap", undefined, admin)).data[
      "blossom-vouchers"
    ].find((v) => v.id === voucher.id).usedCount === 1,
    "Voucher is consumed exactly once",
  );
  for (const status of ["Chờ pha", "Đang pha", "Hoàn tất"])
    check(
      (
        await call(
          "/api/action",
          { type: "order-status", orderId: order.id, status },
          cashier,
        )
      ).ok,
      "Cashier transition " + status,
    );
  check(
    (await call("/api/bootstrap", undefined, customer)).user.points === 64,
    "Completion awards four points once",
  );
  for (const productId of ["1", "2"])
    check(
      (
        await call(
          "/api/action",
          {
            type: "review",
            orderId: order.id,
            productId,
            rating: 5,
            comment: "Ngon",
          },
          customer,
        )
      ).ok,
      "One review for each actual purchased product",
    );
  check(
    (
      await call(
        "/api/action",
        { type: "review", orderId: order.id, productId: "1", rating: 4 },
        customer,
      )
    ).status === 400,
    "Duplicate product review is rejected",
  );
  check(
    (
      await call(
        "/api/action",
        { type: "review", orderId: order.id, productId: "6", rating: 4 },
        customer,
      )
    ).status === 403,
    "Unpurchased product cannot be reviewed",
  );
  check(
    (
      await call(
        "/api/action",
        { type: "member-add", name: "Không hợp lệ", phone: "0912345678" },
        cashier,
      )
    ).status === 403,
    "Cashier only looks up members",
  );
  check(
    (
      await call(
        "/api/action",
        { type: "member-add", name: "Thành viên quầy", phone: "0912345678" },
        admin,
      )
    ).ok,
    "Admin enrolls members",
  );
  check(
    (
      await call(
        "/api/action",
        { type: "shift-open", openingCash: "" },
        cashier,
      )
    ).status === 400,
    "Empty opening cash is rejected",
  );
  check(
    (
      await call(
        "/api/action",
        { type: "shift-open", openingCash: -1 },
        cashier,
      )
    ).status === 400,
    "Negative opening cash is rejected",
  );
  const shift = (
    await call(
      "/api/action",
      { type: "shift-open", openingCash: 100000 },
      cashier,
    )
  ).shift;
  check(!!shift?.openedAt, "Server creates the shift and timestamp");
  check(
    (await call("/api/action", { type: "shift-open", openingCash: 0 }, cashier))
      .status === 409,
    "Only one open shift per cashier",
  );
  const pos = (
    await call(
      "/api/action",
      {
        type: "create-order",
        items: [{ productId: "1", size: "S", quantity: 1 }],
        orderType: "counter",
        paymentMethod: "cash",
      },
      cashier,
    )
  ).order;
  check(
    pos.shiftId === shift.id && pos.status === "Chờ pha",
    "POS payment belongs to the open shift",
  );
  check(
    shiftCashSummary([pos], shift).expected === 137000,
    "Paid cash counts while order is still waiting for preparation",
  );
  r = await call(
    "/api/action",
    { type: "shift-close", actualCash: 137000 },
    cashier,
  );
  check(
    r.ok && r.shift.cashDifference === 0,
    "Close reconciles against actual cash received",
  );
  check(
    (
      await call(
        "/api/patch",
        {
          changes: [
            {
              key: "blossom-cashier-current-shift-demo-cashier",
              before: r.shift,
              after: { ...r.shift, status: "open" },
            },
          ],
        },
        cashier,
      )
    ).status === 403,
    "Browser cannot rewrite a closed shift",
  );
  check(
    (
      await call(
        "/api/action",
        {
          type: "create-order",
          items: payload.items,
          orderType: "counter",
          paymentMethod: "cash",
        },
        cashier,
      )
    ).status === 400,
    "POS stops after shift closure",
  );
  r = await call(
    "/api/action",
    {
      type: "support-add",
      subject: "Hỗ trợ đơn",
      content: "Cho tôi hỏi giờ nhận hàng.",
    },
    customer,
  );
  const request = r.data["blossom-support"][0];
  for (const status of ["In-progress", "Done"])
    check(
      (
        await call(
          "/api/action",
          {
            type: "reply",
            kind: "support",
            id: request.id,
            status,
            reply: "Đã tiếp nhận",
          },
          admin,
        )
      ).ok,
      "Admin processes support " + status,
    );
  check(
    (
      await call(
        "/api/action",
        {
          type: "reply",
          kind: "support",
          id: request.id,
          status: "Cancelled",
          reply: "x",
        },
        cashier,
      )
    ).status === 403,
    "Cashier cannot handle support management",
  );
  check(
    (
      await call(
        "/api/action",
        {
          type: "publish-notice",
          role: "customer",
          title: "Ưu đãi mới",
          content: "Menu đã cập nhật.",
        },
        admin,
      )
    ).ok,
    "Admin publishes to a defined audience",
  );
  check(
    (await call("/api/bootstrap", undefined, admin)).data[
      "blossom-brew-notifications"
    ].some((n) => n.title === "Ưu đãi mới" && n.createdBy),
    "Admin retains sent announcement history",
  );
  check(
    !(await call("/api/bootstrap", undefined, cashier)).data[
      "blossom-brew-notifications"
    ].some((n) => n.title === "Ưu đãi mới"),
    "Customer announcement is not returned to cashier",
  );
  // Re-open the actual local database to prove data survives application restart.
  runtime.close();
  runtime = await createLocalRuntime(directory);
  check(
    (await call("/api/bootstrap", undefined, customer)).data[
      "blossom-orders"
    ].some((v) => v.id === order.id),
    "Local SQLite preserves orders and sessions after restart",
  );

  const { JSDOM } = await import("jsdom");
  dom = new JSDOM('<div id="root"></div>', { url: "https://brew.test/login" });
  for (const key of [
    "window",
    "document",
    "Event",
    "CustomEvent",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLSelectElement",
    "sessionStorage",
  ])
    globalThis[key] = key === "window" ? dom.window : dom.window[key];
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    configurable: true,
  });
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  window.confirm = () => true;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.fetch = (url, options = {}) =>
    worker.fetch(
      new Request("https://brew.test" + url, {
        ...options,
        headers: { ...options.headers, Origin: "https://brew.test" },
      }),
      runtime.env,
    );
  const React = await import("react"),
    { act } = React,
    { createRoot } = await import("react-dom/client"),
    { BrowserRouter } = await import("react-router-dom"),
    { createServer } = await import("vite");
  vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
  });
  const { bootstrap, store } = await vite.ssrLoadModule(
    "/src/services/dataStore.js",
  );
  const { default: App } = await vite.ssrLoadModule("/src/App.jsx");
  await bootstrap();
  root = createRoot(document.getElementById("root"));
  const settle = async () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });
  const go = async (route) => {
    await act(async () => {
      window.history.pushState({}, "", route);
      window.dispatchEvent(new dom.window.PopStateEvent("popstate"));
    });
    await settle();
  };
  const fill = async (selector, value) =>
    act(async () => {
      const input = document.querySelector(selector);
      assert(input, selector);
      const proto =
        input.tagName === "SELECT"
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(input, value);
      input.dispatchEvent(
        new Event(input.tagName === "SELECT" ? "change" : "input", {
          bubbles: true,
        }),
      );
    });
  const click = async (element) => {
    assert(element);
    await act(async () => element.click());
    await settle();
  };
  const submit = async (selector) => {
    await act(async () =>
      document
        .querySelector(selector)
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    await settle();
  };
  const button = (text) =>
    [...document.querySelectorAll("button")].find((v) =>
      v.textContent.trim().includes(text),
    );
  await act(async () =>
    root.render(
      React.createElement(BrowserRouter, null, React.createElement(App)),
    ),
  );
  await settle();
  await fill('input[name="email"]', "admin@blossombrew.vn");
  await fill('input[name="password"]', "Admin123");
  await submit("form");
  await go("/admin/products");
  await click(button("Thêm món mới"));
  await fill('input[name="name"]', "Ô long mật ong");
  await fill('input[name="productCode"]', "TE-AUDIT");
  await click(
    document.querySelector('.admin-product-size-option input[type="checkbox"]'),
  );
  await submit(".admin-product-modal form");
  check(
    document.body.textContent.includes("Vui lòng nhập giá hợp lệ"),
    "Admin validates selected size before saving",
  );
  await fill('input[aria-label="Giá size S"]', "36000");
  await submit(".admin-product-modal form");
  check(
    !document.querySelector(".admin-product-modal"),
    "Admin save closes only after server success",
  );
  const products = JSON.parse(store.getItem("blossom-products"));
  const newProduct = products.find((v) => v.name === "Ô long mật ong");
  check(
    newProduct?.sizes.length === 1 && newProduct.sizes[0].size === "S",
    "Mounted admin form really creates selected S size",
  );
  await act(async () => store.logout());
  await go("/");
  check(
    document.body.textContent.includes("Ô long mật ong"),
    "Guest reads the saved admin menu",
  );
  await go("/login");
  await fill('input[name="email"]', "customer@blossombrew.vn");
  await fill('input[name="password"]', "Customer123");
  await submit("form");
  store.setItem(
    "blossom-cart",
    JSON.stringify([
      {
        cartId: "test",
        productId: newProduct.id,
        name: newProduct.name,
        size: "S",
        quantity: 1,
        price: 36000,
        toppings: [],
      },
    ]),
  );
  await go("/customer/checkout");
  await submit(".bb-checkout-form");
  check(
    !!document.querySelector("dialog[open]"),
    "Checkout opens payment confirmation",
  );
  const draftId = store.getItem("blossom-checkout-order");
  await click(button("Mô phỏng thất bại"));
  check(
    document.querySelector("dialog").textContent.includes("thất bại"),
    "Failed payment displays a retryable error",
  );
  await click(button("Thanh toán sau"));
  check(
    window.location.pathname === "/customer/history" &&
      document.body.textContent.includes("Thanh toán lại"),
    "History exposes unpaid order recovery",
  );
  await click(button("Thanh toán lại"));
  await submit(".bb-checkout-form");
  await click(button("Mô phỏng thành công"));
  check(
    document.body.textContent.includes("Đặt hàng thành công"),
    "Retry finishes checkout",
  );
  const saved = JSON.parse(store.getItem("blossom-orders")).filter(
    (v) => v.id === draftId,
  );
  check(
    saved.length === 1 && saved[0].paymentStatus === "paid",
    "UI retry pays the same order without duplicates",
  );
  await go("/admin/products");
  check(
    document.body.textContent.includes("Bạn không có quyền truy cập màn này."),
    "Customer cannot enter admin CRUD screen",
  );
  await act(async () => store.logout());
  await go("/login");
  await fill('input[name="email"]', "cashier@blossombrew.vn");
  await fill('input[name="password"]', "Cashier123");
  await submit("form");
  check(
    !document.body.textContent.includes("+ Thêm thành viên"),
    "POS offers lookup rather than member management",
  );
  console.log(
    JSON.stringify({
      workflow_checks: count,
      local_persistence: "passed",
      mounted_admin_and_checkout: "passed",
      status: "passed",
    }),
  );
} finally {
  if (root) {
    const { act } = await import("react");
    await act(async () => root.unmount());
  }
  if (vite) await vite.close();
  if (dom) dom.window.close();
  runtime.close();
  await rm(directory, { recursive: true, force: true });
}
