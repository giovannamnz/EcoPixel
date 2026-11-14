// server.js — Servidor estático + Crawler de Auditoria Web (Playwright)
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".wasm": "application/wasm",
};

// Lê o corpo JSON de requisições POST
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

// Crawler com Headless Browser para auditar páginas reais
async function auditRealUrl(targetUrl, device = "mobile") {
  const viewport = device === "mobile"
    ? { width: 390, height: 844 }
    : { width: 1366, height: 768 };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    userAgent: device === "mobile"
      ? "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36"
      : undefined
  });

  const page = await context.newPage();
  const intercepted = [];
  const seenUrls = new Set();

  // Intercepta todas as respostas de rede da página
  page.on("response", async (response) => {
    try {
      const status = response.status();
      const ct = (response.headers()["content-type"] || "").toLowerCase();
      const imgUrl = response.url();

      if (status === 200 && (ct.includes("image/jpeg") || ct.includes("image/png")) && !seenUrls.has(imgUrl)) {
        seenUrls.add(imgUrl);
        const buffer = await response.body();
        // Ignora tracking pixels minúsculos (< 1 KB)
        if (buffer.length >= 1024) {
          const cleanName = path.basename(new URL(imgUrl).pathname) || `imagem_${intercepted.length + 1}.jpg`;
          intercepted.push({
            name: cleanName,
            url: imgUrl,
            mimeType: ct.split(";")[0],
            bytes: buffer.length,
            base64: buffer.toString("base64"),
          });
        }
      }
    } catch {
      // Ignora respostas abortadas ou bloqueadas por CORS interno
    }
  });

  // Injeta observador para capturar o Largest Contentful Paint (LCP)
  await page.addInitScript(() => {
    window.__lcpMs = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) window.__lcpMs = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });

  const navStart = Date.now();
  await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
  const loadTimeMs = Date.now() - navStart;
  const lcpMs = await page.evaluate(() => Math.round(window.__lcpMs || 0));

  await browser.close();

  return {
    url: targetUrl,
    device,
    loadTimeMs,
    lcpMs,
    totalImages: intercepted.length,
    totalImageBytes: intercepted.reduce((acc, img) => acc + img.bytes, 0),
    images: intercepted,
  };
}

http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);

  // Rota da API de Auditoria via Crawler
  if (req.method === "POST" && parsedUrl.pathname === "/api/audit-url") {
    try {
      const { url, device } = await readJsonBody(req);
      if (!url || !/^https?:\/\//i.test(url)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Informe uma URL válida iniciando com http:// ou https://" }));
      }
      const report = await auditRealUrl(url, device || "mobile");
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(report));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: `Falha ao auditar URL: ${err.message}` }));
    }
  }

  // Servir arquivos estáticos (HTML, JS, CSS, WASM)
  let p;
  try { p = decodeURIComponent(parsedUrl.pathname); }
  catch { res.writeHead(400); return res.end("Bad request"); }
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}).listen(PORT, "127.0.0.1", () => console.log(`EcoPixel TCC em http://localhost:${PORT}/`));