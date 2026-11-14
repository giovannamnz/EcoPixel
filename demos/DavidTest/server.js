// Tiny static server for testing eco-pixel in the browser.
// Put this file in a "demo" folder next to "pkg" (the wasm-pack output).
// Run it with:  node demo/server.js   (from the crate root)

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, ".."); // crate root, so /demo and /pkg are both reachable
const PORT = process.env.PORT || 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".wasm": "application/wasm", // browsers need this MIME type to compile WASM while streaming
  ".map": "application/json",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      return send(res, 400, "Bad request");
    }

    if (urlPath === "/") {
      res.writeHead(302, { Location: "/demos/DavidTest" });
      return res.end();
    }

    if (urlPath.endsWith("/")) urlPath += "index.html";

    // Only serve the demo page and the built package.
    if (!/^\/(demo|pkg)\//.test(urlPath)) return send(res, 404, "Not found");

    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT + path.sep)) return send(res, 403, "Forbidden");

    fs.readFile(filePath, (err, data) => {
      if (err) {
        const hint = urlPath.startsWith("/pkg/")
          ? "Not found. Did you run: wasm-pack build --target web --release ?"
          : "Not found";
        return send(res, 404, hint);
      }
      send(res, 200, data, TYPES[path.extname(filePath)] || "application/octet-stream");
    });
  })
  .listen(PORT, "127.0.0.1", () => {
    console.log(`eco-pixel demo running at http://localhost:${PORT}/`);
  });
