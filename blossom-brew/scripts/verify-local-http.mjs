import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
const directory = await mkdtemp(path.join(os.tmpdir(), "blossom-http-"));
const server = fork(
  fileURLToPath(new URL("../server/http.mjs", import.meta.url)),
  ["--built"],
  {
    env: { ...process.env, BREW_API_PORT: "0", BREW_DATA_DIR: directory },
    stdio: ["ignore", "ignore", "inherit", "ipc"],
  },
);
try {
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Local server did not start")),
      15000,
    );
    server.on("message", (message) => {
      if (message.ready) {
        clearTimeout(timeout);
        resolve(message.port);
      }
    });
    server.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error("Local server exited " + code));
    });
  });
  const origin = "http://127.0.0.1:" + port;
  for (const route of ["/", "/login", "/admin/products", "/customer/history"]) {
    const response = await fetch(origin + route, {
      headers: { Accept: "text/html" },
    });
    assert.equal(response.status, 200);
    assert((await response.text()).includes("Blossom Brew"));
  }
  const login = await fetch(origin + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({
      email: "admin@blossombrew.vn",
      password: "Admin123",
    }),
  });
  assert.equal(login.status, 200);
  const account = await login.json();
  assert.equal(account.user.role, "admin");
  const state = await fetch(origin + "/api/bootstrap", {
    headers: { "X-Brew-Session": account.sessionToken },
  });
  assert.equal((await state.json()).user.role, "admin");
  console.log(
    JSON.stringify({
      local_http_routes: 4,
      login_and_session: "passed",
      status: "passed",
    }),
  );
} finally {
  const exited = new Promise((resolve) => server.once("exit", resolve));
  server.kill();
  await exited;
  await rm(directory, { recursive: true, force: true });
}
