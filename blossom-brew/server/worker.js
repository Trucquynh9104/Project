import {
  evaluateVoucher,
  ORDER_TRANSITIONS,
  isMoney,
  voucherCodeValid,
  shiftCashSummary,
} from "../shared/businessRules.js";
const EMBEDDED_ASSETS =
  typeof __EMBEDDED_ASSETS__ === "undefined" ? {} : __EMBEDDED_ASSETS__;
const K = {
  users: "blossom-brew-users",
  products: "blossom-products",
  vouchers: "blossom-vouchers",
  orders: "blossom-orders",
  members: "blossom-brew-loyalty-members",
  personal: "blossom-personal-vouchers",
  reviews: "blossom-reviews",
  notices: "blossom-brew-notifications",
  shifts: "blossom-cashier-shift-history",
  support: "blossom-support",
};
const next = ORDER_TRANSITIONS;
const now = () => new Date().toISOString();
const clean = (u) =>
  u
    ? Object.fromEntries(
        Object.entries(u).filter(
          ([k]) => !["hash", "salt", "password"].includes(k),
        ),
      )
    : null;
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const requireRole = (u, roles) => {
  if (!u || !roles.includes(u.role))
    fail("Bạn không có quyền thực hiện thao tác này.", 403);
};
const emailValid = (e) => /^\S+@\S+\.\S+$/.test(e || "");
const money = isMoney;
async function hash(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: new TextEncoder().encode(salt),
          iterations: 100000,
          hash: "SHA-256",
        },
        key,
        256,
      ),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
async function withPassword(u, password) {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  )
    fail("Mật khẩu cần từ 8 đến 128 ký tự.");
  const salt = crypto.randomUUID();
  return { ...clean(u), salt, hash: await hash(password, salt) };
}
function notice(s, role, title, content, to, userId = "") {
  s[K.notices].unshift({
    id: crypto.randomUUID(),
    recipientRole: role,
    recipientUserId: userId,
    title,
    content,
    to,
    createdAt: now(),
    readBy: [],
  });
}
async function seed() {
  const names = [
    ["Cold Brew Cam", "Cà phê", 45000],
    ["Latte Hoa Nhài", "Cà phê", 52000],
    ["Trà Đào Cam Sả", "Trà", 49000],
    ["Matcha Latte", "Trà", 59000],
    ["Chocolate Đá Xay", "Đá xay", 55000],
    ["Americano", "Cà phê", 39000],
  ];
  const s = Object.fromEntries(Object.values(K).map((k) => [k, []]));
  s[K.products] = names.map(([name, category, price], i) => ({
    id: String(i + 1),
    name,
    category,
    price,
    sizes: [
      { size: "S", price: price - 8000 },
      { size: "M", price },
      { size: "L", price: price + 8000 },
    ],
    available: true,
    note: "",
  }));
  for (const [id, name, email, role, password, points] of [
    [
      "demo-admin",
      "Quản trị viên",
      "admin@blossombrew.vn",
      "admin",
      "Admin123",
      0,
    ],
    [
      "demo-cashier",
      "Linh Trần",
      "cashier@blossombrew.vn",
      "cashier",
      "Cashier123",
      0,
    ],
    [
      "demo-customer",
      "Khách hàng demo",
      "customer@blossombrew.vn",
      "customer",
      "Customer123",
      60,
    ],
  ])
    s[K.users].push(
      await withPassword(
        {
          id,
          name,
          email,
          role,
          points,
          phone: role === "customer" ? "0901234567" : "",
          active: true,
          storeId: "blossom-main",
          createdAt: now(),
        },
        password,
      ),
    );
  s[K.vouchers] = [
    {
      id: "voucher-1",
      code: "BBSILVER",
      type: "percent",
      value: 20,
      minOrder: 80000,
      maxDiscount: 30000,
      requiresSilver: true,
      active: true,
      startDate: "2026-01-01",
      expiry: "2026-12-31",
      usedCount: 0,
      usageLimit: 100,
    },
    {
      id: "voucher-2",
      code: "WELCOME25",
      type: "fixed",
      value: 25000,
      minOrder: 60000,
      maxDiscount: 0,
      requiresSilver: false,
      active: true,
      startDate: "2026-01-01",
      expiry: "2026-12-31",
      usedCount: 0,
      usageLimit: 200,
    },
  ];
  s[K.notices] = [
    {
      id: "public-welcome",
      recipientRole: "guest",
      title: "Chào bạn, Blossom Brew đã sẵn sàng",
      content:
        "Menu theo mùa và ưu đãi thành viên WELCOME25 cho đơn từ 60.000đ. Đơn hàng nhận tại quán.",
      to: "/",
      createdAt: now(),
      readBy: [],
    },
  ];
  notice(
    s,
    "customer",
    "Chào mừng đến Blossom Brew",
    "Khám phá menu và ưu đãi thành viên.",
    "/customer/menu",
  );
  notice(
    s,
    "cashier",
    "Bắt đầu ca làm",
    "Ghi tiền mặt đầu ca trước khi bán hàng tại quầy.",
    "/cashier/shift",
  );
  notice(
    s,
    "admin",
    "Cửa hàng đã sẵn sàng",
    "Quản lý menu, đơn hàng, ca làm và phản hồi tại một nơi.",
    "/admin",
  );
  return s;
}
async function readState(db) {
  let row = await db
    .prepare("SELECT data, revision FROM brew_state WHERE id = ?")
    .bind("main")
    .first();
  if (!row) {
    await db
      .prepare(
        "INSERT OR IGNORE INTO brew_state (id,data,revision) VALUES (?,?,0)",
      )
      .bind("main", JSON.stringify(await seed()))
      .run();
    row = await db
      .prepare("SELECT data, revision FROM brew_state WHERE id = ?")
      .bind("main")
      .first();
  }
  return { s: JSON.parse(row.data), revision: row.revision };
}
async function mutate(db, fn) {
  for (let i = 0; i < 4; i++) {
    const { s, revision } = await readState(db);
    const result = await fn(s);
    const saved = await db
      .prepare(
        "UPDATE brew_state SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?",
      )
      .bind(JSON.stringify(s), "main", revision)
      .run();
    if (saved.meta.changes) return { s, result };
  }
  fail("Dữ liệu vừa thay đổi. Vui lòng thử lại.", 409);
}
function cookie(req, name) {
  return req.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(name + "="))
    ?.slice(name.length + 1);
}
function sessionToken(req) {
  return req.headers.get("x-brew-session") || cookie(req, "brew-session");
}
async function actor(req, db, s) {
  const token = sessionToken(req);
  if (!token) return null;
  const row = await db
    .prepare(
      "SELECT user_id FROM brew_sessions WHERE token = ? AND expires_at > ?",
    )
    .bind(token, Date.now())
    .first();
  return row
    ? s[K.users].find((u) => u.id === row.user_id && u.active !== false) || null
    : null;
}
function project(s, u) {
  const role = u?.role || "guest";
  const data = {};
  data[K.products] = s[K.products].filter(
    (p) => role === "admin" || p.available !== false,
  );
  data[K.notices] = s[K.notices]
    .filter(
      (n) =>
        role === "admin" ||
        n.recipientRole === "guest" ||
        (n.recipientRole === role &&
          (!n.recipientUserId || n.recipientUserId === u?.id)),
    )
    .map((n) => ({
      ...n,
      readBy: n.readBy?.filter((id) => id === u?.id) || [],
    }));
  if (!u) return { data, user: null };
  data[K.vouchers] = s[K.vouchers];
  data[K.users] = s[K.users]
    .filter(
      (v) =>
        role === "admin" ||
        v.id === u.id ||
        (role === "cashier" && v.role === "customer"),
    )
    .map((v) =>
      role === "cashier" && v.id !== u.id
        ? {
            id: v.id,
            name: v.name,
            phone: v.phone,
            points: v.points,
            role: v.role,
          }
        : clean(v),
    );
  data[K.orders] = s[K.orders].filter(
    (o) =>
      role === "admin" ||
      (role === "cashier" &&
        o.storeId === u.storeId &&
        o.paymentStatus === "paid") ||
      o.member?.id === u.id,
  );
  data[K.members] = role === "admin" || role === "cashier" ? s[K.members] : [];
  data[K.personal] = s[K.personal].filter(
    (v) => role === "admin" || role === "cashier" || v.userId === u.id,
  );
  data[K.reviews] =
    role === "admin"
      ? s[K.reviews]
      : s[K.reviews].filter((r) => r.userId === u.id);
  data[K.shifts] = s[K.shifts].filter(
    (v) => role === "admin" || v.cashierId === u.id,
  );
  data[K.support] = s[K.support].filter(
    (v) => role === "admin" || v.userId === u.id,
  );
  for (const [key, val] of Object.entries(s))
    if (
      key.startsWith("blossom-cashier-current-shift-") &&
      (role === "admin" || key.endsWith(u.id))
    )
      data[key] = val;
  return { data, user: clean(u) };
}
function voucherDiscount(s, code, subtotal, member) {
  if (!code) return { discount: 0 };
  const v =
    s[K.personal].find((v) => v.code === code && v.userId === member?.id) ||
    s[K.vouchers].find((v) => v.code === code);
  const result = evaluateVoucher(v, subtotal, member);
  if (!result.ok) fail(result.message);
  return result;
}
function orderItems(s, items) {
  if (!Array.isArray(items) || items.length === 0 || items.length > 100)
    fail("Vui lòng chọn ít nhất một sản phẩm.");
  return items.map((item) => {
    const p = s[K.products].find(
      (p) => p.id === String(item.productId) || p.name === item.name,
    );
    if (!p || p.available === false)
      fail("Món đã tạm ẩn hoặc không còn tồn tại.");
    const size = p.sizes.find((z) => z.size === item.size);
    if (!size) fail("Size không còn được bán. Vui lòng chọn lại.");
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    )
      fail("Số lượng cần từ 1 đến 99.");
    const toppings = [...new Set(item.toppings || [])];
    if (
      toppings.some(
        (x) => !["Trân châu trắng", "Thạch đào", "Kem cheese"].includes(x),
      )
    )
      fail("Topping không hợp lệ.");
    return {
      ...item,
      productId: p.id,
      name: p.name,
      price: Number(size.price) + toppings.length * 5000,
      toppings,
      note: String(item.note || "").slice(0, 500),
    };
  });
}
function group(status) {
  return status === "Hoàn tất"
    ? "completed"
    : status === "Đã hủy"
      ? "cancelled"
      : status === "Chờ xác nhận"
        ? "incomplete"
        : "processing";
}
async function mediaURL(value, kind, env, u) {
  if (!value) return "";
  if (value.startsWith("/api/media/")) {
    if (
      kind === "avatar" &&
      !value.startsWith("/api/media/avatars/" + u.id + "/")
    )
      fail("Ảnh đại diện chưa hợp lệ.");
    if (kind === "product" && !value.startsWith("/api/media/products/"))
      fail("Ảnh sản phẩm chưa hợp lệ.");
    return value;
  }
  const match =
    /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) fail("Ảnh cần có định dạng JPG, PNG hoặc WebP.");
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  if (bytes.length > 2 * 1024 * 1024) fail("Ảnh cần nhỏ hơn 2 MB.");
  if (!env.BUCKET) fail("Chưa lưu được ảnh. Vui lòng thử lại.", 503);
  const key =
    (kind === "avatar" ? "avatars/" + u.id + "/" : "products/") +
    crypto.randomUUID();
  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: match[1] } });
  return "/api/media/" + key;
}
function confirmPaidOrder(s, order, voucher) {
  if (voucher) {
    if (voucher.userId) {
      voucher.used = true;
      voucher.usedAt = now();
    } else voucher.usedCount = Number(voucher.usedCount || 0) + 1;
  }
  notice(
    s,
    "admin",
    "Đơn mới " + order.id,
    order.product,
    "/admin/orders?order=" + encodeURIComponent(order.id),
  );
  notice(s, "cashier", "Đơn mới " + order.id, order.product, "/cashier/orders");
  if (order.member?.memberType === "account")
    notice(
      s,
      "customer",
      "Thanh toán thành công",
      order.id + " đang chờ xử lý.",
      "/customer/history",
      order.member.id,
    );
}
async function action(s, u, a, env) {
  if (a.type === "create-order") {
    requireRole(u, ["customer", "cashier"]);
    if (a.requestId) {
      if (!/^[a-f0-9-]{36}$/.test(a.requestId)) fail("Mã yêu cầu chưa hợp lệ.");
      const existing = s[K.orders].find(
        (o) =>
          o.requestId === a.requestId &&
          (o.member?.id === u.id || o.cashierId === u.id),
      );
      if (existing) return { ok: true, order: existing };
    }
    const online = u.role === "customer";
    if (online && a.orderType !== "pickup")
      fail("Phiên bản này chỉ nhận đơn tại quán.");
    const shift = online ? null : s["blossom-cashier-current-shift-" + u.id];
    if (!online && shift?.status !== "open")
      fail("Vui lòng mở ca trước khi tạo đơn POS.");
    const items = orderItems(s, a.items),
      subtotal = items.reduce((sum, v) => sum + v.price * v.quantity, 0);
    const member = online
      ? u
      : [...s[K.users], ...s[K.members]].find(
          (v) => v.id === a.member?.id && (!v.role || v.role === "customer"),
        ) || null;
    const vd = voucherDiscount(
      s,
      String(a.voucherCode || "")
        .trim()
        .toUpperCase(),
      subtotal,
      member,
    );
    if (
      !["qr", "card", "wallet", ...(!online ? ["cash"] : [])].includes(
        a.paymentMethod,
      )
    )
      fail("Phương thức thanh toán chưa hợp lệ.");
    if (
      online &&
      (!a.receiver?.trim() ||
        !/^\d{9,11}$/.test((a.deliveryInfo?.phone || "").replace(/\D/g, "")))
    )
      fail("Vui lòng nhập tên và số điện thoại hợp lệ.");
    if (!online && a.paymentResult === "pending")
      fail("Đơn POS cần xác nhận kết quả thanh toán.");
    if (!online && a.paymentResult === "failed")
      return {
        ok: false,
        message:
          "Thanh toán mô phỏng thất bại. Chưa hoàn tất đơn POS; vui lòng thử lại.",
      };
    const paid = !["pending", "failed"].includes(a.paymentResult);
    const order = {
      requestId: a.requestId || null,
      id: "#BB-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      createdAt: now(),
      time: new Date().toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
      paidAt: paid ? now() : null,
      items,
      product: items.map((v) => v.name + " ×" + v.quantity).join(", "),
      subtotal,
      discount: vd.discount,
      total: subtotal - vd.discount,
      voucherCode: vd.voucher?.code || "",
      orderType: online ? "pickup" : "counter",
      paymentMethod: a.paymentMethod,
      paymentStatus: paid
        ? "paid"
        : a.paymentResult === "failed"
          ? "failed"
          : "pending",
      receiver: online ? a.receiver.trim() : member?.name || "Khách vãng lai",
      deliveryInfo: online
        ? {
            name: a.receiver.trim(),
            phone: a.deliveryInfo.phone,
            note: String(a.deliveryInfo.note || "").slice(0, 500),
            address: "",
          }
        : null,
      member: member
        ? {
            id: member.id,
            name: member.name,
            phone: member.phone || "",
            points: member.points,
            memberType: member.role ? "account" : "loyalty",
          }
        : null,
      status: online ? "Chờ xác nhận" : "Chờ pha",
      group: "incomplete",
      storeId: u.storeId || "blossom-main",
      cashierId: online ? null : u.id,
      cashierName: online ? "" : u.name,
      shiftId: shift?.id || null,
      pointsAwarded: false,
      earnedPoints: 0,
    };
    order.group = group(order.status);
    s[K.orders].unshift(order);
    if (paid) confirmPaidOrder(s, order, vd.voucher);
    else
      notice(
        s,
        "customer",
        "Đơn chờ thanh toán",
        order.id + ": bạn có thể thanh toán lại từ lịch sử.",
        "/customer/checkout?orderId=" + encodeURIComponent(order.id),
        u.id,
      );
    return { ok: true, order };
  }
  if (a.type === "pay-order") {
    requireRole(u, ["customer"]);
    const order = s[K.orders].find(
      (o) => o.id === a.orderId && o.member?.id === u.id,
    );
    if (!order) fail("Không tìm thấy đơn của bạn.", 404);
    if (order.status === "Đã hủy")
      fail("Đơn đã hủy không thể thanh toán.", 409);
    if (order.paymentStatus === "paid") return { ok: true, order };
    if (!["qr", "card", "wallet"].includes(a.paymentMethod))
      fail("Phương thức thanh toán chưa hợp lệ.");
    order.paymentMethod = a.paymentMethod;
    if (a.paymentResult === "failed") {
      order.paymentStatus = "failed";
      order.paymentUpdatedAt = now();
      return {
        ok: false,
        order,
        message: "Thanh toán mô phỏng thất bại. Đơn được giữ lại để thử lại.",
      };
    }
    if (a.paymentResult !== "success")
      fail("Chưa nhận được kết quả thanh toán.");
    const items = orderItems(s, order.items),
      subtotal = items.reduce((sum, v) => sum + v.price * v.quantity, 0);
    const vd = voucherDiscount(
      s,
      String(a.voucherCode ?? order.voucherCode)
        .trim()
        .toUpperCase(),
      subtotal,
      u,
    );
    const newTotal = subtotal - vd.discount;
    Object.assign(order, {
      items,
      subtotal,
      discount: vd.discount,
      total: newTotal,
      voucherCode: vd.voucher?.code || "",
    });
    if (Number(a.expectedTotal) !== newTotal)
      return {
        ok: false,
        order,
        message:
          "Giá hoặc ưu đãi đã thay đổi. Kiểm tra tổng tiền mới rồi xác nhận lại.",
      };
    order.paymentStatus = "paid";
    order.paidAt = now();
    order.paymentUpdatedAt = now();
    confirmPaidOrder(s, order, vd.voucher);
    return { ok: true, order };
  }
  if (a.type === "shift-open") {
    requireRole(u, ["cashier"]);
    if (!money(a.openingCash)) fail("Nhập số tiền đầu ca nguyên, không âm.");
    const key = "blossom-cashier-current-shift-" + u.id;
    if (s[key]?.status === "open")
      fail("Ca hiện tại đang mở. Đóng ca trước khi mở ca mới.", 409);
    const shift = {
      id: crypto.randomUUID(),
      cashierId: u.id,
      cashierName: u.name,
      storeId: u.storeId,
      name: "Ca làm việc",
      status: "open",
      startedManually: true,
      openedAt: now(),
      closedAt: null,
      openingCash: Number(a.openingCash),
      actualCash: null,
    };
    s[key] = shift;
    s[K.shifts].unshift(shift);
    return { ok: true, shift };
  }
  if (a.type === "shift-close") {
    requireRole(u, ["cashier"]);
    if (!money(a.actualCash)) fail("Nhập số tiền kiểm đếm nguyên, không âm.");
    const shift = s["blossom-cashier-current-shift-" + u.id];
    if (shift?.status !== "open") fail("Không có ca đang mở.", 409);
    Object.assign(shift, {
      status: "closed",
      closedAt: now(),
      actualCash: Number(a.actualCash),
    });
    const totals = shiftCashSummary(s[K.orders], shift);
    Object.assign(shift, {
      expectedCash: totals.expected,
      cashDifference: totals.difference,
    });
    const index = s[K.shifts].findIndex((v) => v.id === shift.id);
    if (index >= 0) s[K.shifts][index] = shift;
    notice(
      s,
      "admin",
      "Ca làm đã kết thúc",
      u.name + " đã gửi số tiền kiểm đếm.",
      "/admin/shifts",
    );
    return { ok: true, shift };
  }
  if (a.type === "order-status") {
    requireRole(u, ["admin", "cashier"]);
    const o = s[K.orders].find((o) => o.id === a.orderId);
    if (!o) fail("Không tìm thấy đơn hàng.", 404);
    if (u.role === "cashier" && o.storeId !== u.storeId)
      fail("Bạn không có quyền xử lý đơn ở cửa hàng khác.", 403);
    if (o.paymentStatus !== "paid" && a.status !== "Đã hủy")
      fail("Đơn chưa thanh toán không thể được pha hoặc hoàn tất.", 409);
    if (!next[o.status]?.includes(a.status))
      fail(
        "Đơn ở trạng thái cuối hoặc không thể chuyển sang trạng thái này.",
        409,
      );
    if (a.status === "Đã hủy" && !a.cancellationReason?.trim())
      fail("Vui lòng nhập lý do hủy đơn.");
    o.status = a.status;
    o.group = group(o.status);
    o.statusUpdatedAt = now();
    if (o.status === "Hoàn tất") {
      if (o.paymentStatus !== "paid") fail("Chỉ hoàn tất đơn đã thanh toán.");
      o.completedAt = now();
      o.completedBy = u.id;
      o.cashierId ||= u.role === "cashier" ? u.id : null;
      o.cashierName ||= u.role === "cashier" ? u.name : "";
      if (!o.pointsAwarded && o.member) {
        const member = [...s[K.users], ...s[K.members]].find(
          (v) => v.id === o.member.id,
        );
        if (member) {
          o.earnedPoints = Math.floor(o.total / 20000);
          member.points = Number(member.points || 0) + o.earnedPoints;
          o.pointsAwarded = true;
          notice(
            s,
            "customer",
            "Điểm đã được cộng",
            o.id + ": +" + o.earnedPoints + " điểm.",
            "/customer/points",
            member.id,
          );
        }
      }
    }
    if (o.status === "Đã hủy") {
      o.cancelledAt = now();
      o.cancellationReason = a.cancellationReason.trim();
      o.cancelledBy = u.id;
      o.refundStatus =
        o.paymentStatus === "paid" ? "Mô phỏng hoàn tiền" : "Chưa thu tiền";
      const v =
        o.paymentStatus === "paid" &&
        (s[K.personal].find(
          (v) => v.code === o.voucherCode && v.userId === o.member?.id,
        ) ||
          s[K.vouchers].find((v) => v.code === o.voucherCode));
      if (v?.userId) {
        v.used = false;
        v.usedAt = "";
      } else if (v) v.usedCount = Math.max(0, Number(v.usedCount) - 1);
    }
    if (o.member?.memberType === "account")
      notice(
        s,
        "customer",
        "Cập nhật đơn " + o.id,
        o.status,
        "/customer/history",
        o.member.id,
      );
    return { ok: true, order: o };
  }
  if (a.type === "profile") {
    requireRole(u, ["admin", "cashier", "customer"]);
    if (!a.name?.trim()) fail("Vui lòng nhập họ tên.");
    if (a.phone && !/^\d{9,11}$/.test(a.phone.replace(/\D/g, "")))
      fail("Số điện thoại chưa hợp lệ.");
    Object.assign(u, {
      name: a.name.trim(),
      phone: a.phone || "",
      avatar: await mediaURL(a.avatar || "", "avatar", env, u),
    });
    if (a.password) {
      const changed = await withPassword(u, a.password);
      Object.assign(u, changed);
    }
    return { ok: true, user: clean(u) };
  }
  if (a.type === "member-add") {
    requireRole(u, ["admin"]);
    const phone = String(a.phone || "").replace(/\D/g, "");
    if (!a.name?.trim() || !/^\d{9,11}$/.test(phone))
      fail("Tên và số điện thoại thành viên chưa hợp lệ.");
    if ([...s[K.users], ...s[K.members]].some((v) => v.phone === phone))
      fail("Số điện thoại này đã là thành viên.");
    const member = {
      id: crypto.randomUUID(),
      name: a.name.trim(),
      phone,
      points: 0,
      memberType: "loyalty",
      createdAt: now(),
    };
    s[K.members].push(member);
    return { ok: true, member };
  }
  if (a.type === "member-points") {
    requireRole(u, ["admin"]);
    if (!money(a.points)) fail("Điểm cần là số nguyên không âm.");
    const m = [...s[K.users], ...s[K.members]].find((v) => v.id === a.id);
    if (!m || (m.role && m.role !== "customer"))
      fail("Không tìm thấy thành viên.");
    m.points = Number(a.points);
    notice(
      s,
      "customer",
      "Điểm thành viên được điều chỉnh",
      "Số dư hiện tại: " + m.points + " điểm.",
      "/customer/points",
      m.id,
    );
    return { ok: true };
  }
  if (a.type === "redeem") {
    requireRole(u, ["customer"]);
    const n = Number(a.pointsToRedeem);
    if (!Number.isInteger(n) || n < 10 || n > Number(u.points))
      fail("Cần đổi ít nhất 10 điểm và không vượt quá số dư.");
    u.points -= n;
    const v = {
      id: crypto.randomUUID(),
      userId: u.id,
      code: "POINTS" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      discount: n * 1000,
      minOrder: 0,
      createdAt: now(),
      expiry: new Date(Date.now() + 30 * 86400000).toISOString(),
      used: false,
    };
    s[K.personal].push(v);
    notice(
      s,
      "customer",
      "Đổi điểm thành công",
      v.code + ": giảm " + v.discount.toLocaleString("vi-VN") + "đ.",
      "/customer/points",
      u.id,
    );
    return {
      ok: true,
      user: clean(u),
      voucher: v,
      message: "Đã đổi " + n + " điểm lấy voucher.",
    };
  }
  if (a.type === "review") {
    requireRole(u, ["customer"]);
    const o = s[K.orders].find(
      (o) => o.id === a.orderId && o.member?.id === u.id,
    );
    if (!o || o.status !== "Hoàn tất")
      fail("Chỉ đánh giá đơn của bạn đã hoàn tất.", 403);
    const item = o.items.find(
      (v) => v.productId === (a.productId || o.items[0].productId),
    );
    if (!item) fail("Sản phẩm không thuộc đơn hàng.", 403);
    if (
      s[K.reviews].some(
        (v) =>
          v.orderId === o.id &&
          (!v.productId || v.productId === item.productId),
      )
    )
      fail("Sản phẩm này trong đơn đã được đánh giá.");
    if (
      !Number.isInteger(a.rating) ||
      a.rating < 1 ||
      a.rating > 5 ||
      String(a.comment || "").length > 500
    )
      fail("Chọn 1–5 sao, nội dung tối đa 500 ký tự.");
    s[K.reviews].push({
      id: crypto.randomUUID(),
      userId: u.id,
      customerName: u.name,
      orderId: o.id,
      productId: item.productId,
      productName: item.name,
      rating: a.rating,
      comment: String(a.comment || "").trim(),
      createdAt: now(),
      reply: "",
    });
    notice(
      s,
      "admin",
      "Đánh giá mới",
      u.name + " đánh giá " + item.name,
      "/admin/feedback",
    );
    return { ok: true };
  }
  if (a.type === "support-add") {
    requireRole(u, ["customer"]);
    if (!a.subject?.trim() || !a.content?.trim() || a.content.length > 2000)
      fail("Nhập chủ đề và nội dung (tối đa 2.000 ký tự).");
    s[K.support].unshift({
      id: crypto.randomUUID(),
      userId: u.id,
      customerName: u.name,
      subject: a.subject.trim(),
      content: a.content.trim(),
      status: "To do",
      reply: "",
      createdAt: now(),
    });
    return { ok: true };
  }
  if (a.type === "reply") {
    requireRole(u, ["admin"]);
    const v = s[a.kind === "review" ? K.reviews : K.support].find(
      (v) => v.id === a.id,
    );
    if (!v) fail("Không tìm thấy yêu cầu.");
    if (String(a.reply || "").length > 2000)
      fail("Nội dung tối đa 2.000 ký tự.");
    v.reply = String(a.reply || "").trim();
    if (a.kind !== "review") {
      if (!["To do", "In-progress", "Done", "Cancelled"].includes(a.status))
        fail("Trạng thái chưa hợp lệ.");
      v.status = a.status;
    }
    v.updatedAt = now();
    notice(
      s,
      "customer",
      "Phản hồi từ Blossom Brew",
      v.reply || "Trạng thái yêu cầu đã cập nhật.",
      a.kind === "review" ? "/customer/history" : "/customer/support",
      v.userId,
    );
    return { ok: true };
  }
  if (a.type === "publish-notice") {
    requireRole(u, ["admin"]);
    if (
      !["guest", "customer", "cashier"].includes(a.role) ||
      !a.title?.trim() ||
      !a.content?.trim() ||
      a.title.length > 150 ||
      a.content.length > 2000
    )
      fail("Nhập tiêu đề, nội dung và đối tượng nhận.");
    notice(
      s,
      a.role,
      a.title.trim(),
      a.content.trim(),
      a.role === "guest"
        ? "/notices"
        : a.role === "customer"
          ? "/customer/notices"
          : "/cashier/notices",
    );
    s[K.notices][0].createdBy = u.id;
    return { ok: true };
  }
  fail("Thao tác chưa được hỗ trợ.");
}
function diff(before, after, id = "id") {
  if (!Array.isArray(before) || !Array.isArray(after))
    fail("Dữ liệu chưa hợp lệ.");
  const b = new Map(before.map((x) => [x[id], x]));
  const a = new Map(after.map((x) => [x[id], x]));
  return [...new Set([...b.keys(), ...a.keys()])]
    .filter((k) => JSON.stringify(b.get(k)) !== JSON.stringify(a.get(k)))
    .map((k) => ({ id: k, before: b.get(k), after: a.get(k) }));
}
async function patches(s, u, changes, env) {
  requireRole(u, ["admin", "cashier", "customer"]);
  for (const { key, before, after } of changes) {
    if (key === K.products || key === K.vouchers || key === K.users) {
      requireRole(u, ["admin"]);
      const list = s[key];
      for (const d of diff(before, after)) {
        if (!d.id || typeof d.id !== "string") fail("Mã dữ liệu chưa hợp lệ.");
        const old = list.find((v) => v.id === d.id);
        if (
          (old && !d.before) ||
          (d.before && JSON.stringify(clean(old)) !== JSON.stringify(d.before))
        )
          fail("Dữ liệu đã thay đổi. Vui lòng tải lại trước khi sửa.", 409);
        if (
          key === K.users &&
          ((old && old.role !== "cashier") ||
            (d.after && d.after.role !== "cashier"))
        )
          fail("Màn này chỉ quản lý tài khoản thu ngân.", 403);
        if (!d.after) {
          s[key] = s[key].filter((v) => v.id !== d.id);
          continue;
        }
        let v = { ...d.after };
        if (key === K.products) {
          if (
            !["Cà phê", "Trà", "Đá xay", "Khác"].includes(v.category) ||
            String(v.note || "").length > 500 ||
            list.some(
              (x) =>
                x.id !== v.id &&
                x.name.trim().toLowerCase() === v.name?.trim().toLowerCase(),
            ) ||
            !v.name?.trim() ||
            v.name.length > 100 ||
            !v.sizes?.length ||
            v.sizes.length > 3 ||
            new Set(v.sizes.map((x) => x.size)).size !== v.sizes.length ||
            v.sizes.some(
              (z) =>
                !["S", "M", "L"].includes(z.size) ||
                !money(z.price) ||
                Number(z.price) <= 0,
            )
          )
            fail("Nhập tên, chọn size S/M/L và giá nguyên dương cho mỗi size.");
          v.price = Math.min(...v.sizes.map((x) => Number(x.price)));
          if (v.image) v.image = await mediaURL(v.image, "product", env, u);
        }
        if (key === K.vouchers) {
          if (
            !voucherCodeValid(v.code) ||
            list.some((x) => x.code === v.code && x.id !== v.id) ||
            !["fixed", "percent"].includes(v.type) ||
            !money(v.value) ||
            Number(v.value) <= 0 ||
            (v.type === "percent" && Number(v.value) > 100) ||
            !money(v.minOrder) ||
            !money(v.maxDiscount) ||
            !money(v.usageLimit) ||
            Number(v.usageLimit) < 1 ||
            (v.startDate && v.expiry && v.expiry < v.startDate)
          )
            fail(
              "Mã, mức giảm, giới hạn sử dụng hoặc ngày hiệu lực chưa hợp lệ.",
            );
          v.usedCount = old?.usedCount || 0;
        }
        if (key === K.users) {
          if (
            !emailValid(v.email) ||
            !v.name?.trim() ||
            list.some(
              (x) =>
                x.email.toLowerCase() === v.email.toLowerCase() &&
                x.id !== v.id,
            )
          )
            fail("Tên hoặc email chưa hợp lệ/trùng.");
          v.email = v.email.trim().toLowerCase();
          v.phone = String(v.phone || "").replace(/\D/g, "");
          if (v.phone && !/^\d{9,11}$/.test(v.phone))
            fail("Số điện thoại thu ngân chưa hợp lệ.");
          v = v.password
            ? await withPassword(
                { ...v, storeId: old?.storeId || "blossom-main" },
                v.password,
              )
            : {
                ...v,
                hash: old?.hash,
                salt: old?.salt,
                storeId: old?.storeId || "blossom-main",
              };
          delete v.password;
          if (!v.hash) fail("Tài khoản mới cần mật khẩu.");
        }
        if (key === K.products) {
          notice(s, "cashier", "Menu vừa cập nhật", v.name, "/cashier");
          notice(s, "customer", "Menu vừa cập nhật", v.name, "/customer/menu");
        }
        if (key === K.vouchers) {
          notice(s, "cashier", "Ưu đãi vừa cập nhật", v.code, "/cashier");
          notice(
            s,
            "customer",
            "Ưu đãi vừa cập nhật",
            v.code,
            "/customer/points",
          );
        }
        const index = s[key].findIndex((x) => x.id === v.id);
        if (index < 0) s[key].push(v);
        else s[key][index] = v;
      }
      continue;
    }
    if (key === K.notices) {
      for (const d of diff(before, after)) {
        const old = s[key].find((v) => v.id === d.id);
        if (
          !old ||
          !d.after ||
          !(old.recipientRole === u.role || old.recipientRole === "guest") ||
          (old.recipientUserId && old.recipientUserId !== u.id)
        )
          fail("Không có quyền sửa thông báo.", 403);
        old.readBy = [...new Set([...(old.readBy || []), u.id])];
      }
      continue;
    }
    if (key === K.shifts || key.startsWith("blossom-cashier-current-shift-"))
      fail("Vui lòng dùng thao tác mở hoặc đóng ca.", 403);
    fail("Bạn không có quyền thay đổi dữ liệu này.", 403);
  }
  return { ok: true };
}
function json(v, status = 200, headers = {}) {
  return new Response(JSON.stringify(v), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      ...headers,
    },
  });
}
function sessionCookie(req, name, token, seconds) {
  return `${name}=${token}; Path=/; HttpOnly; Max-Age=${seconds}${new URL(req.url).protocol === "https:" ? "; SameSite=None; Secure; Partitioned" : "; SameSite=Lax"}`;
}
async function api(req, env) {
  const db = env.DB;
  if (!db) fail("Dữ liệu tạm thời chưa khả dụng. Vui lòng thử lại.", 503);
  const path = new URL(req.url).pathname;
  if (
    req.method !== "GET" &&
    ((req.headers.get("origin") &&
      req.headers.get("origin") !== new URL(req.url).origin) ||
      req.headers.get("sec-fetch-site") === "cross-site")
  )
    fail("Yêu cầu không hợp lệ.", 403);
  const { s } = await readState(db);
  const u = await actor(req, db, s);
  if (req.method === "GET" && path.startsWith("/api/media/")) {
    const key = decodeURIComponent(path.slice("/api/media/".length));
    if (key.startsWith("avatars/")) {
      requireRole(u, ["admin", "customer", "cashier"]);
      if (u.role !== "admin" && !key.startsWith("avatars/" + u.id + "/"))
        fail("Không có quyền xem ảnh.", 403);
    } else if (!key.startsWith("products/")) fail("Không tìm thấy ảnh.", 404);
    const object = await env.BUCKET?.get(key);
    if (!object) fail("Không tìm thấy ảnh.", 404);
    return new Response(object.body, {
      headers: {
        "Content-Type": object.httpMetadata?.contentType || "image/png",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (req.method === "GET" && path === "/api/bootstrap")
    return json(project(s, u));
  if (req.method !== "POST") fail("Không tìm thấy chức năng.", 404);
  if (!req.headers.get("content-type")?.includes("application/json"))
    fail("Yêu cầu cần dữ liệu JSON.", 415);
  const raw = await req.text();
  if (raw.length > 3200000) fail("Dữ liệu quá lớn.", 413);
  let a;
  try {
    a = JSON.parse(raw || "{}");
  } catch {
    fail("Dữ liệu JSON chưa hợp lệ.");
  }
  if (!a || typeof a !== "object" || Array.isArray(a))
    fail("Dữ liệu chưa hợp lệ.");
  if (path === "/api/login") {
    const account = s[K.users].find(
      (v) =>
        v.email ===
        String(a.email || "")
          .trim()
          .toLowerCase(),
    );
    if (
      !account ||
      account.active === false ||
      (await hash(String(a.password || ""), account.salt)) !== account.hash
    )
      fail("Email hoặc mật khẩu chưa đúng, hoặc tài khoản đã tạm ngưng.", 401);
    const token = crypto.randomUUID() + crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO brew_sessions (token,user_id,expires_at) VALUES (?,?,?)",
      )
      .bind(token, account.id, Date.now() + 86400000)
      .run();
    return json(
      { ok: true, sessionToken: token, ...project(s, account) },
      200,
      { "Set-Cookie": sessionCookie(req, "brew-session", token, 86400) },
    );
  }
  if (path === "/api/register") {
    if (u) fail("Đăng xuất trước khi đăng ký tài khoản mới.", 403);
    if (!a.name?.trim() || !emailValid(a.email))
      fail("Họ tên hoặc email chưa hợp lệ.");
    const email = a.email.trim().toLowerCase();
    const added = await mutate(db, async (state) => {
      if (state[K.users].some((v) => v.email === email))
        fail("Email đã được sử dụng.");
      const user = await withPassword(
        {
          id: crypto.randomUUID(),
          name: a.name.trim(),
          email,
          phone: "",
          role: "customer",
          points: 0,
          active: true,
          avatar: "",
          storeId: "blossom-main",
          createdAt: now(),
        },
        a.password,
      );
      state[K.users].push(user);
      return user;
    });
    const token = crypto.randomUUID() + crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO brew_sessions (token,user_id,expires_at) VALUES (?,?,?)",
      )
      .bind(token, added.result.id, Date.now() + 86400000)
      .run();
    return json(
      { ok: true, sessionToken: token, ...project(added.s, added.result) },
      200,
      { "Set-Cookie": sessionCookie(req, "brew-session", token, 86400) },
    );
  }
  if (path === "/api/logout") {
    await db
      .prepare("DELETE FROM brew_sessions WHERE token = ?")
      .bind(sessionToken(req) || "")
      .run();
    return json({ ok: true }, 200, {
      "Set-Cookie": sessionCookie(req, "brew-session", "", 0),
    });
  }
  if (path === "/api/recovery-start") {
    const user = s[K.users].find(
      (v) =>
        v.email ===
        String(a.email || "")
          .trim()
          .toLowerCase(),
    );
    if (!user) fail("Không tìm thấy tài khoản với email này.");
    const token = crypto.randomUUID();
    const code = String(
      crypto.getRandomValues(new Uint32Array(1))[0] % 1000000,
    ).padStart(6, "0");
    await db
      .prepare(
        "INSERT INTO brew_recovery (token,user_id,code,expires_at) VALUES (?,?,?,?)",
      )
      .bind(token, user.id, code, Date.now() + 300000)
      .run();
    return json(
      {
        ok: true,
        demoCode: code,
        message: "Mã mô phỏng có hiệu lực 5 phút. Không gửi email thật.",
      },
      200,
      { "Set-Cookie": sessionCookie(req, "brew-recovery", token, 300) },
    );
  }
  if (path === "/api/recovery-verify" || path === "/api/recovery-reset") {
    const token = cookie(req, "brew-recovery") || "";
    const row = await db
      .prepare("SELECT * FROM brew_recovery WHERE token = ? AND expires_at > ?")
      .bind(token, Date.now())
      .first();
    if (!row || row.attempts >= 5) fail("Mã đã hết hạn hoặc quá 5 lần thử.");
    if (path.endsWith("verify")) {
      await db
        .prepare(
          "UPDATE brew_recovery SET attempts = attempts + 1 WHERE token = ?",
        )
        .bind(token)
        .run();
      if (a.code !== row.code) fail("Mã xác thực chưa đúng.");
      await db
        .prepare("UPDATE brew_recovery SET verified = 1 WHERE token = ?")
        .bind(token)
        .run();
      return json({ ok: true });
    }
    if (!row.verified) fail("Bạn cần xác thực OTP trước.", 403);
    await mutate(db, async (state) => {
      const v = state[K.users].find((v) => v.id === row.user_id);
      Object.assign(v, await withPassword(v, a.newPassword));
    });
    await db.batch([
      db.prepare("DELETE FROM brew_recovery WHERE token = ?").bind(token),
      db
        .prepare("DELETE FROM brew_sessions WHERE user_id = ?")
        .bind(row.user_id),
    ]);
    return json({ ok: true }, 200, {
      "Set-Cookie": sessionCookie(req, "brew-recovery", "", 0),
    });
  }
  requireRole(u, ["customer", "cashier", "admin"]);
  if (path !== "/api/action" && path !== "/api/patch")
    fail("Không tìm thấy chức năng.", 404);
  const result = await mutate(db, async (state) => {
    const current = state[K.users].find(
      (v) => v.id === u.id && v.active !== false,
    );
    requireRole(current, ["customer", "cashier", "admin"]);
    return path === "/api/action"
      ? action(state, current, a, env)
      : patches(state, current, a.changes || [], env);
  });
  const current = result.s[K.users].find((v) => v.id === u.id);
  return json({ ...result.result, ...project(result.s, current) });
}
export default {
  async fetch(req, env) {
    try {
      const url = new URL(req.url);
      if (url.pathname.startsWith("/api/")) return await api(req, env);
      if (env.ASSETS) {
        const asset = await env.ASSETS.fetch(req);
        if (asset.status !== 404) return asset;
        if (
          req.method === "GET" &&
          req.headers.get("accept")?.includes("text/html")
        )
          return env.ASSETS.fetch(
            new Request(new URL("/index.html", req.url), req),
          );
        return asset;
      }
      const asset =
        EMBEDDED_ASSETS[url.pathname] ||
        (req.method === "GET" &&
        req.headers.get("accept")?.includes("text/html")
          ? EMBEDDED_ASSETS["/index.html"]
          : null);
      if (asset) {
        const body = asset.base64
          ? Uint8Array.from(atob(asset.body), (c) => c.charCodeAt(0))
          : asset.body;
        return new Response(body, {
          headers: {
            "Content-Type": asset.type,
            "Cache-Control": asset.type.startsWith("text/html")
              ? "private, no-store"
              : "private, max-age=300",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      return new Response("Không tìm thấy trang.", { status: 404 });
    } catch (e) {
      if (!e.status || e.status >= 500)
        console.error("Blossom Brew:", e.status || 500, e.message);
      return json(
        {
          ok: false,
          message: e.status
            ? e.message
            : "Không thể tải hoặc lưu dữ liệu. Vui lòng thử lại.",
        },
        e.status || 500,
      );
    }
  },
};
