import { fork, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const api = fork(
  fileURLToPath(new URL("../server/http.mjs", import.meta.url)),
  [],
  { stdio: ["inherit", "inherit", "inherit", "ipc"] },
);
let client,
  stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill();
  client?.kill();
  process.exitCode = code;
}
api.on("message", (message) => {
  if (!message.ready || client) return;
  client = spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL("../node_modules/vite/bin/vite.js", import.meta.url),
      ),
      ...process.argv.slice(2),
    ],
    { stdio: "inherit" },
  );
  client.on("exit", (code) => stop(code || 0));
});
api.on("exit", (code) => stop(code || 0));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
