import { mkdir, copyFile, cp, readFile, readdir } from "node:fs/promises";
import { build } from "vite";
import path from "node:path";
const assets = {};
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
};
async function collect(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) {
      await collect(file);
      continue;
    }
    const ext = path.extname(file),
      binary = [".webp", ".png", ".jpeg", ".jpg"].includes(ext),
      bytes = await readFile(file);
    assets["/" + path.relative("dist/client", file).split(path.sep).join("/")] =
      {
        type: types[ext] || "application/octet-stream",
        body: bytes.toString(binary ? "base64" : "utf8"),
        base64: binary,
      };
  }
}
await collect("dist/client");
assets["/"] = assets["/index.html"];
await build({
  configFile: false,
  define: { __EMBEDDED_ASSETS__: JSON.stringify(assets) },
  build: {
    ssr: "server/worker.js",
    outDir: "dist/server",
    emptyOutDir: true,
    rolldownOptions: { output: { entryFileNames: "index.js" } },
  },
});
await mkdir("dist/.openai", { recursive: true });
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
await cp("drizzle", "dist/.openai/drizzle", { recursive: true });
