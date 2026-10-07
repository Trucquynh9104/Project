import assert from "node:assert/strict";
import worker from "../dist/server/index.js";
for (const route of [
  "/",
  "/customer/cart",
  "/cashier/orders",
  "/admin/products",
]) {
  const r = await worker.fetch(
    new Request("https://example.test" + route, {
      headers: { accept: "text/html" },
    }),
    {},
  );
  assert.equal(r.status, 200);
  assert(r.headers.get("cache-control").includes("no-store"));
  const html = await r.text();
  assert(html.includes("Blossom Brew"));
  const script = html.match(/src="([^"]+\.js)"/)[1];
  const js = await worker.fetch(
    new Request("https://example.test" + script),
    {},
  );
  assert.equal(js.status, 200);
  assert(js.headers.get("content-type").includes("javascript"));
}
const img = await worker.fetch(
  new Request("https://example.test/coffee-hero.webp"),
  {},
);
assert.equal(img.status, 200);
assert.equal(img.headers.get("content-type"), "image/webp");
assert((await img.arrayBuffer()).byteLength > 10000);
console.log(
  JSON.stringify({
    artifact_routes: 4,
    assets: "passed",
    worker_fetch: "passed",
  }),
);
