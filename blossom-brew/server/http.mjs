import http from "node:http";
import { createLocalRuntime } from "./local-runtime.mjs";
const built = process.argv.includes("--built");
const { default: worker } = await import(
  built ? "../dist/server/index.js" : "./worker.js"
);
const runtime = await createLocalRuntime(
  process.env.BREW_DATA_DIR || ".blossom",
);
const port = Number(process.env.BREW_API_PORT || (built ? 4173 : 8787));
const server = http.createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > 3200000) {
        outgoing.writeHead(413);
        outgoing.end("Request too large");
        return;
      }
      chunks.push(chunk);
    }
    const origin = "http://" + incoming.headers.host;
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const request = new Request(origin + incoming.url, {
      method: incoming.method,
      headers: incoming.headers,
      body,
      duplex: "half",
    });
    const response = await worker.fetch(request, runtime.env);
    outgoing.writeHead(
      response.status,
      Object.fromEntries(response.headers.entries()),
    );
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("Local server:", error.message);
    outgoing.writeHead(500, { "Content-Type": "application/json" });
    outgoing.end(
      JSON.stringify({
        ok: false,
        message: "Không thể kết nối dữ liệu. Vui lòng thử lại.",
      }),
    );
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log(
    "Blossom Brew " + (built ? "preview" : "API") + " ready on port " + port,
  );
  process.send?.({ ready: true, port: server.address().port });
});
function stop() {
  server.close(() => {
    runtime.close();
    process.exit(0);
  });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
