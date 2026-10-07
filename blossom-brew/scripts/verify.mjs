import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import worker from "../server/worker.js";
const sqlite = new DatabaseSync(":memory:");
sqlite.exec(readFileSync("drizzle/0000_brave_mystique.sql", "utf8"));
const db = {
  prepare(sql) {
    let args = [];
    return {
      bind(...a) {
        args = a;
        return this;
      },
      async first() {
        return sqlite.prepare(sql).get(...args) || null;
      },
      async run() {
        const r = sqlite.prepare(sql).run(...args);
        return { meta: { changes: Number(r.changes) } };
      },
    };
  },
  async batch(items) {
    sqlite.exec("BEGIN");
    try {
      const r = await Promise.all(items.map((x) => x.run()));
      sqlite.exec("COMMIT");
      return r;
    } catch (e) {
      sqlite.exec("ROLLBACK");
      throw e;
    }
  },
};
const media = new Map();
const env = {
  DB: db,
  BUCKET: {
    async put(key, bytes, opts) {
      media.set(key, { body: bytes, httpMetadata: opts.httpMetadata });
    },
    async get(key) {
      return media.get(key) || null;
    },
  },
};
let count = 0;
async function call(path, body, cookie = "") {
  const res = await worker.fetch(
    new Request("https://brew.test" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
  return {
    status: res.status,
    data: await res.json(),
    cookie: res.headers.get("set-cookie")?.split(";")[0],
  };
}
const check = (expr) => {
  assert(expr);
  count++;
};
const guest = await call("/api/bootstrap");
check(guest.status === 200);
check(guest.data.user === null);
check(!guest.data.data["blossom-brew-users"]);
check(!guest.data.data["blossom-orders"]);
const customer = (
  await call("/api/login", {
    email: "customer@blossombrew.vn",
    password: "Customer123",
  })
).cookie;
const admin = (
  await call("/api/login", {
    email: "admin@blossombrew.vn",
    password: "Admin123",
  })
).cookie;
const cashier = (
  await call("/api/login", {
    email: "cashier@blossombrew.vn",
    password: "Cashier123",
  })
).cookie;
check(Boolean(customer && admin && cashier));
let r = await call("/api/bootstrap", undefined, customer);
check(r.data.user.points === 60);
check(r.data.data["blossom-brew-users"].length === 1);
check(!JSON.stringify(r.data).includes('"hash"'));
check(!JSON.stringify(r.data).includes('"password"'));
check(
  (
    await call(
      "/api/patch",
      { changes: [{ key: "blossom-products", before: [], after: [] }] },
      customer,
    )
  ).status === 403,
);
check(
  (
    await call(
      "/api/action",
      { type: "order-status", orderId: "x", status: "Hoàn tất" },
      customer,
    )
  ).status === 403,
);
check(
  (
    await call(
      "/api/action",
      {
        type: "create-order",
        items: [],
        orderType: "pickup",
        paymentMethod: "qr",
        receiver: "Khách",
        deliveryInfo: { phone: "0901234567" },
      },
      customer,
    )
  ).status === 400,
);
const baseOrder = {
  type: "create-order",
  items: [
    {
      productId: "1",
      name: "Cold Brew Cam",
      size: "M",
      quantity: 2,
      price: 1,
      toppings: [],
    },
  ],
  orderType: "pickup",
  paymentMethod: "qr",
  receiver: "Khách hàng demo",
  deliveryInfo: { phone: "0901234567" },
  voucherCode: "WELCOME25",
};
r = await call(
  "/api/action",
  { ...baseOrder, paymentResult: "failed" },
  customer,
);
check(r.data.ok);
check(r.data.order.paymentStatus === "failed");
check(r.data.data["blossom-orders"].length === 1);
r = await call("/api/action", baseOrder, customer);
check(r.data.ok);
check(r.data.order.total === 65000);
check(r.data.order.status === "Chờ xác nhận");
const oid = r.data.order.id;
check(
  (
    await call(
      "/api/action",
      { type: "review", orderId: oid, rating: 5, comment: "Đẹp" },
      customer,
    )
  ).status === 403,
);
check(
  (
    await call(
      "/api/action",
      { type: "order-status", orderId: oid, status: "Hoàn tất" },
      cashier,
    )
  ).status === 409,
);
for (const status of ["Chờ pha", "Đang pha", "Hoàn tất"])
  check(
    (
      await call(
        "/api/action",
        { type: "order-status", orderId: oid, status },
        cashier,
      )
    ).data.ok,
  );
r = await call("/api/bootstrap", undefined, customer);
check(r.data.user.points === 63);
check(
  (
    await call(
      "/api/action",
      { type: "order-status", orderId: oid, status: "Hoàn tất" },
      admin,
    )
  ).status === 409,
);
r = await call(
  "/api/action",
  { type: "review", orderId: oid, rating: 5, comment: "Rất ngon" },
  customer,
);
check(r.data.ok);
check(
  (
    await call(
      "/api/action",
      { type: "review", orderId: oid, rating: 5 },
      customer,
    )
  ).status === 400,
);
const other = await call("/api/register", {
  name: "Khách khác",
  email: "other@example.vn",
  password: "Customer234",
});
check(other.data.ok);
check(
  (await call("/api/bootstrap", undefined, other.cookie)).data.data[
    "blossom-orders"
  ].length === 0,
);
check(
  (
    await call(
      "/api/action",
      { type: "review", orderId: oid, rating: 5 },
      other.cookie,
    )
  ).status === 403,
);
r = await call("/api/action", { type: "redeem", pointsToRedeem: 10 }, customer);
check(r.data.ok);
check(r.data.user.points === 53);
const personal = r.data.voucher.code;
r = await call(
  "/api/action",
  {
    ...baseOrder,
    items: [{ productId: "1", size: "S", quantity: 1 }],
    voucherCode: personal,
  },
  customer,
);
check(r.data.order.total === 27000);
const cancelled = r.data.order.id;
check(
  (await call("/api/action", { ...baseOrder, voucherCode: personal }, customer))
    .status === 400,
);
check(
  (
    await call(
      "/api/action",
      {
        type: "order-status",
        orderId: cancelled,
        status: "Đã hủy",
        cancellationReason: "",
      },
      cashier,
    )
  ).status === 400,
);
check(
  (
    await call(
      "/api/action",
      {
        type: "order-status",
        orderId: cancelled,
        status: "Đã hủy",
        cancellationReason: "Khách đổi ý",
      },
      cashier,
    )
  ).data.ok,
);
check(
  (await call("/api/bootstrap", undefined, customer)).data.user.points === 53,
);
check(
  (
    await call(
      "/api/action",
      {
        type: "create-order",
        items: baseOrder.items,
        orderType: "counter",
        paymentMethod: "cash",
      },
      cashier,
    )
  ).status === 400,
);
r = await call(
  "/api/action",
  { type: "shift-open", openingCash: 100000 },
  cashier,
);
check(r.data.ok);
const shift = r.data.shift;
r = await call(
  "/api/action",
  {
    type: "create-order",
    items: baseOrder.items,
    orderType: "counter",
    paymentMethod: "cash",
  },
  cashier,
);
check(r.data.ok);
check(r.data.order.total === 90000);
check(r.data.order.status === "Chờ pha");
r = await call(
  "/api/action",
  { type: "shift-close", actualCash: 190000 },
  cashier,
);
check(r.data.ok);
const closed = r.data.shift;
check(
  (await call("/api/bootstrap", undefined, admin)).data.data[
    "blossom-cashier-shift-history"
  ][0].actualCash === 190000,
);
r = await call("/api/bootstrap", undefined, admin);
let products = r.data.data["blossom-products"];
let hidden = products.map((p) =>
  p.id === "1" ? { ...p, available: false } : p,
);
check(
  (
    await call(
      "/api/patch",
      {
        changes: [{ key: "blossom-products", before: products, after: hidden }],
      },
      admin,
    )
  ).data.ok,
);
check(
  (await call("/api/bootstrap")).data.data["blossom-products"].length === 5,
);
check((await call("/api/action", baseOrder, customer)).status === 400);
check(
  (
    await call(
      "/api/patch",
      {
        changes: [
          {
            key: "blossom-products",
            before: hidden,
            after: [
              ...hidden,
              { id: "bad", name: "Bad", sizes: [{ size: "XL", price: 100 }] },
            ],
          },
        ],
      },
      admin,
    )
  ).status === 400,
);
check(
  (
    await call(
      "/api/patch",
      {
        changes: [
          {
            key: "blossom-products",
            before: products,
            after: products.filter((p) => p.id !== "1"),
          },
        ],
      },
      admin,
    )
  ).status === 409,
);
r = await call(
  "/api/action",
  {
    type: "support-add",
    subject: "Hỏi về đơn hàng",
    content: "Hỗ trợ giúp tôi.",
  },
  customer,
);
check(r.data.ok);
const support = r.data.data["blossom-support"][0];
check(
  (
    await call(
      "/api/action",
      {
        type: "reply",
        kind: "support",
        id: support.id,
        status: "Done",
        reply: "Đã hỗ trợ.",
      },
      cashier,
    )
  ).status === 403,
);
check(
  (
    await call(
      "/api/action",
      {
        type: "reply",
        kind: "support",
        id: support.id,
        status: "Done",
        reply: "Đã hỗ trợ.",
      },
      admin,
    )
  ).data.ok,
);
check(
  (
    await call(
      "/api/action",
      {
        type: "publish-notice",
        role: "guest",
        title: "Giờ mở cửa",
        content: "07:00–21:00",
      },
      admin,
    )
  ).data.ok,
);
check(
  (await call("/api/bootstrap")).data.data["blossom-brew-notifications"].some(
    (v) => v.title === "Giờ mở cửa",
  ),
);
r = await call("/api/bootstrap", undefined, admin);
const users = r.data.data["blossom-brew-users"];
check(
  (
    await call(
      "/api/patch",
      {
        changes: [
          {
            key: "blossom-brew-users",
            before: users,
            after: users.map((v) =>
              v.role === "cashier" ? { ...v, active: false } : v,
            ),
          },
        ],
      },
      admin,
    )
  ).data.ok,
);
check(
  (
    await call(
      "/api/action",
      { type: "member-add", name: "Tạm ngưng", phone: "0902222333" },
      cashier,
    )
  ).status === 403,
);
check(
  (
    await call("/api/login", {
      email: "cashier@blossombrew.vn",
      password: "Cashier123",
    })
  ).status === 401,
);
const recovery = await call("/api/recovery-start", {
  email: "other@example.vn",
});
check(recovery.data.ok);
check(
  (
    await call(
      "/api/recovery-reset",
      { newPassword: "Changed123" },
      recovery.cookie,
    )
  ).status === 403,
);
check(
  (await call("/api/recovery-verify", { code: "x" }, recovery.cookie))
    .status === 400,
);
check(
  (
    await call(
      "/api/recovery-verify",
      { code: recovery.data.demoCode },
      recovery.cookie,
    )
  ).data.ok,
);
check(
  (
    await call(
      "/api/recovery-reset",
      { newPassword: "Changed123" },
      recovery.cookie,
    )
  ).data.ok,
);
check(
  (
    await call("/api/login", {
      email: "other@example.vn",
      password: "Customer234",
    })
  ).status === 401,
);
check(
  (
    await call("/api/login", {
      email: "other@example.vn",
      password: "Changed123",
    })
  ).data.ok,
);

const idemId = crypto.randomUUID();
const idemOrder = {
  ...baseOrder,
  requestId: idemId,
  items: [{ productId: "2", size: "M", quantity: 2 }],
  voucherCode: "",
};
const beforeIdem = (await call("/api/bootstrap", undefined, customer)).data
  .data["blossom-orders"].length;
const first = await call("/api/action", idemOrder, customer);
const second = await call("/api/action", idemOrder, customer);
check(first.data.order.id === second.data.order.id);
check(
  (await call("/api/bootstrap", undefined, customer)).data.data[
    "blossom-orders"
  ].length ===
    beforeIdem + 1,
);
const avatar = "data:image/png;base64,iVBORw0KGgo=";
const uploaded = await call(
  "/api/action",
  { type: "profile", name: "Khách hàng demo", phone: "0901234567", avatar },
  customer,
);
check(
  uploaded.data.user.avatar.startsWith("/api/media/avatars/demo-customer/"),
);
check(!JSON.stringify(uploaded.data).includes(avatar));
const visible = await worker.fetch(
  new Request("https://brew.test" + uploaded.data.user.avatar, {
    headers: { Cookie: customer },
  }),
  env,
);
check(visible.status === 200);
check(
  (
    await worker.fetch(
      new Request("https://brew.test" + uploaded.data.user.avatar),
      env,
    )
  ).status === 403,
);
check((await call("/api/logout", {}, customer)).data.ok);
check((await call("/api/bootstrap", undefined, customer)).data.user === null);
console.log(JSON.stringify({ backend_checks: count, status: "passed" }));

export { env, call, admin };
