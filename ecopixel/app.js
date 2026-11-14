import init, { ImageInput, convert_image_to_webp_auto } from "./pkg/eco_pixel.js";

const $ = id => document.getElementById(id);
const drop = $("drop"), fileEl = $("file"), lossyEl = $("lossy"), statusEl = $("status");
const listEl = $("list"), totalsEl = $("totals"), crawlSummaryEl = $("crawlSummary");
const targetSsimEl = $("targetSsim"), ssimValEl = $("ssimVal"), codecEl = $("codec");
const deviceProfileEl = $("deviceProfile"), pageviewsEl = $("pageviews");
const auditUrlEl = $("auditUrl"), crawlViewportEl = $("crawlViewport"), btnAudit = $("btnAudit");

let appReady = false, runId = 0, urls = [], lastFiles = [];

const setStatus = (m, c = "") => { statusEl.textContent = m; statusEl.className = c; };
const fmt = n => n < 1024 ? n + " B" : n < 1048576 ? (n / 1024).toFixed(1).replace(".", ",") + " KB" : (n / 1048576).toFixed(2).replace(".", ",") + " MB";
const fmtEnergy = wh => Math.abs(wh) < 1 ? (wh * 1000).toFixed(3).replace(".", ",") + " mWh" : wh.toFixed(4).replace(".", ",") + " Wh";
const track = u => (urls.push(u), u);

init()
  .then(() => { appReady = true; setStatus("Pronto. Insira uma URL para auditar ou escolha suas imagens locais."); })
  .catch(e => setStatus("Não foi possível carregar o núcleo WebAssembly: " + (e?.message ?? e), "error"));

// --- 1. MÉTRICAS PERCEPTUAIS (Luma, PSNR e SSIM) ---
async function luma(blob, w, h) {
  const bm = await createImageBitmap(blob, { resizeWidth: w, resizeHeight: h, resizeQuality: "high" });
  const x = new OffscreenCanvas(w, h).getContext("2d");
  x.drawImage(bm, 0, 0);
  const d = x.getImageData(0, 0, w, h).data, g = new Float32Array(w * h);
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[4 * i] + 0.587 * d[4 * i + 1] + 0.114 * d[4 * i + 2];
  return g;
}

async function measureQualityAndDecode(orig, candidateBlob) {
  const probe = await createImageBitmap(orig);
  const s = Math.min(1, 512 / Math.max(probe.width, probe.height));
  const w = Math.max(8, Math.round(probe.width * s)), h = Math.max(8, Math.round(probe.height * s));

  const a = await luma(orig, w, h);

  // Mede o tempo empírico de decodificação do formato otimizado no cliente
  const tDec0 = performance.now();
  const decProbe = await createImageBitmap(candidateBlob);
  decProbe.close();
  const decodeMs = performance.now() - tDec0;

  const b = await luma(candidateBlob, w, h);

  let mse = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; mse += d * d; }
  mse /= a.length;
  const psnr = mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse);

  const C1 = 6.5025, C2 = 58.5225;
  let sum = 0, n = 0;
  for (let y = 0; y + 8 <= h; y += 8) {
    for (let x = 0; x + 8 <= w; x += 8) {
      let ma = 0, mb = 0;
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { const k = (y + j) * w + x + i; ma += a[k]; mb += b[k]; }
      ma /= 64; mb /= 64;
      let va = 0, vb = 0, c = 0;
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        const k = (y + j) * w + x + i;
        va += (a[k] - ma) ** 2; vb += (b[k] - mb) ** 2; c += (a[k] - ma) * (b[k] - mb);
      }
      va /= 63; vb /= 63; c /= 63;
      sum += ((2 * ma * mb + C1) * (2 * c + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      n++;
    }
  }
  const ssim = n ? sum / n : 1;
  const cls = ssim >= 0.95 ? ["Alta fidelidade", "good"] : ssim >= 0.85 ? ["Fidelidade moderada", "bad"] : ["Alta degradação perceptual", "err"];
  return { psnr, ssim, cls, decodeMs, width: probe.width, height: probe.height };
}

// --- 2. MOTOR DE DECISÃO ADAPTATIVO (Busca Binária sob Restrição de SSIM) ---
async function findOptimalCompression(file, targetMime, minSsim) {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);

  let low = 10, high = 100;
  let best = null;
  let iterations = 0;
  const tTotal0 = performance.now();

  while (low <= high) {
    iterations++;
    const midQ = Math.floor((low + high) / 2);
    const blob = await canvas.convertToBlob({ type: targetMime, quality: midQ / 100 });

    // Verifica se o navegador suporta o codec escolhido (ex: AVIF)
    if (blob.type !== targetMime && targetMime === "image/avif") {
      throw new Error("Este navegador não suporta codificação AVIF nativa via OffscreenCanvas. Use WebP ou Chrome/Firefox recente.");
    }

    const qMetrics = await measureQualityAndDecode(file, blob);

    if (qMetrics.ssim >= minSsim) {
      best = {
        quality: midQ,
        blob,
        bytes: blob.size,
        q: qMetrics,
      };
      high = midQ - 1; // Atende à meta: tenta comprimir ainda mais
    } else {
      low = midQ + 1;  // Degradou demais: aumenta qualidade
    }
  }

  // Fallback caso nem Q=100 atinja o SSIM exigido
  if (!best) {
    const blob = await canvas.convertToBlob({ type: targetMime, quality: 1.0 });
    const qMetrics = await measureQualityAndDecode(file, blob);
    best = { quality: 100, blob, bytes: blob.size, q: qMetrics };
  }

  const encodeMs = performance.now() - tTotal0;
  return { ...best, iterations, encodeMs };
}

// --- 3. MODELO DE BALANÇO ENERGÉTICO PONTA-A-PONTA (Rede vs. CPU) ---
function computeEnergyTradeoff({ origBytes, optBytes, encodeMs, decodeMs, clientTdpWatts, pageviews }) {
  const SERVER_TDP_WATTS = 65.0;   // Perfil médio de vCPU em servidor
  const SWD_KWH_PER_GB = 0.81;     // Sustainable Web Design Model
  const CARBON_G_PER_KWH = 442.0;  // Intensidade média global

  const deltaBytes = Math.max(0, origBytes - optBytes);
  const deltaGB = deltaBytes / (1024 ** 3);

  // Energia economizada na rede por visualização (em Watt-hora)
  const netSavedWhPerView = (deltaGB * SWD_KWH_PER_GB) * 1000;

  // Energia gasta na CPU do cliente para decodificar por visualização (Wh)
  const clientDecodeWhPerView = SERVER_TDP_WATTS > 0
    ? (clientTdpWatts * (decodeMs / 1000)) / 3600
    : 0;

  // Energia gasta 1 única vez no servidor para otimizar/codificar (Wh)
  const serverEncodeWhOnce = (SERVER_TDP_WATTS * (encodeMs / 1000)) / 3600;

  // Saldo líquido por acesso (Rede economizada - Decodificação cliente)
  const netGainPerViewWh = netSavedWhPerView - clientDecodeWhPerView;

  // Balanço Líquido Total para N pageviews (Wh)
  const totalNetBalanceWh = (pageviews * netGainPerViewWh) - serverEncodeWhOnce;
  const totalNetCo2Grams = (totalNetBalanceWh / 1000) * CARBON_G_PER_KWH;

  // Ponto de Equilíbrio (Break-even Pageviews N*)
  const breakEvenViews = netGainPerViewWh > 0
    ? Math.ceil(serverEncodeWhOnce / netGainPerViewWh)
    : Infinity;

  return {
    deltaBytes,
    netSavedWhPerView,
    clientDecodeWhPerView,
    serverEncodeWhOnce,
    totalNetBalanceWh,
    totalNetCo2Grams,
    breakEvenViews,
    isNetPositive: totalNetBalanceWh > 0,
  };
}

// --- PROCESSAMENTO UNIFICADO DE CADA IMAGEM ---
async function processFile(file) {
  const targetSsim = parseFloat(targetSsimEl.value);
  const targetMime = codecEl.value;
  const clientTdp = parseFloat(deviceProfileEl.value);
  const pageviews = parseInt(pageviewsEl.value, 10);
  const allowLossy = lossyEl.checked;

  const bytes = new Uint8Array(await file.arrayBuffer());

  // 1. Executa sempre o núcleo Rust/WASM como referência/baseline
  const tWasm0 = performance.now();
  const input = ImageInput.from_bytes(bytes);
  const wasmOut = convert_image_to_webp_auto(input, allowLossy);
  const wasmMs = performance.now() - tWasm0;

  let chosenBlob, chosenBytes, modeLabel, qMetrics, encodeMs, iterations = 1;

  if (!allowLossy) {
    // Modo Lossless via Rust WASM
    chosenBlob = new Blob([wasmOut.data], { type: "image/webp" });
    chosenBytes = wasmOut.webp_bytes;
    encodeMs = wasmMs;
    qMetrics = await measureQualityAndDecode(file, chosenBlob);
    modeLabel = `Rust WASM (${wasmOut.mode})`;
  } else {
    // Modo Adaptativo via Busca Binária Perceptual
    const opt = await findOptimalCompression(file, targetMime, targetSsim);
    chosenBlob = opt.blob;
    chosenBytes = opt.bytes;
    encodeMs = opt.encodeMs;
    qMetrics = opt.q;
    iterations = opt.iterations;
    const extLabel = targetMime === "image/avif" ? "AVIF" : "WebP";
    modeLabel = `${extLabel} Adaptativo (Q*=${opt.quality} em ${iterations} iterações)`;
  }

  const saved = wasmOut.original_bytes - chosenBytes;
  const smaller = saved > 0;

  const energy = computeEnergyTradeoff({
    origBytes: wasmOut.original_bytes,
    optBytes: smaller ? chosenBytes : wasmOut.original_bytes,
    encodeMs,
    decodeMs: qMetrics.decodeMs,
    clientTdpWatts: clientTdp,
    pageviews,
  });

  return {
    name: file.name,
    file,
    w: wasmOut.width,
    h: wasmOut.height,
    orig: wasmOut.original_bytes,
    wasmBaselineBytes: wasmOut.webp_bytes,
    optBytes: chosenBytes,
    saved,
    smaller,
    mode: modeLabel,
    targetMime: allowLossy ? targetMime : "image/webp",
    encodeMs,
    decodeMs: qMetrics.decodeMs,
    q: qMetrics,
    energy,
    blob: chosenBlob,
  };
}

// --- RENDERIZAÇÃO NA INTERFACE ---
function row(dt, dd, cls) {
  const a = document.createElement("dt"), b = document.createElement("dd");
  a.textContent = dt; b.textContent = dd;
  if (cls) b.className = cls;
  return [a, b];
}

function thumb(label, src) {
  const f = document.createElement("figure"), i = document.createElement("img");
  i.src = src; i.alt = label;
  f.append(i, label);
  return f;
}

function render(r) {
  const el = document.createElement("article"); el.className = "item";
  const th = document.createElement("div"); th.className = "thumbs";
  const outLabel = r.targetMime === "image/avif" ? "AVIF" : "WebP";
  th.append(thumb("Original", track(URL.createObjectURL(r.file))), thumb(outLabel, track(URL.createObjectURL(r.blob))));

  const body = document.createElement("div"), h = document.createElement("h3");
  h.textContent = r.name;

  const pct = r.orig ? (r.saved / r.orig) * 100 : 0;
  const dl = document.createElement("dl");

  dl.append(
    ...row("Dimensões", `${r.w} × ${r.h}`),
    ...row("Estratégia", r.mode),
    ...row("Original vs. Rust Auto", `${fmt(r.orig)} → ${fmt(r.wasmBaselineBytes)}`),
    ...row(`Saída (${outLabel})`, fmt(r.optBytes)),
    ...(r.smaller
      ? row("Economia de Rede", `${fmt(r.saved)} (${pct.toFixed(1).replace(".", ",")}% menor)`, "good")
      : row("Economia de Rede", "Nenhuma: mantenha o arquivo original.", "bad")),
    ...row("SSIM / PSNR", `${r.q.ssim.toFixed(4).replace(".", ",")} (${r.q.cls[0]}) · ${isFinite(r.q.psnr) ? r.q.psnr.toFixed(1).replace(".", ",") + " dB" : "∞"}`, r.q.cls[1]),
    ...row("Telemetria CPU", `Codif.: ${r.encodeMs.toFixed(1).replace(".", ",")} ms · Decodif. Cliente: ${r.decodeMs.toFixed(2).replace(".", ",")} ms`),
    ...row(
      `Balanço Líquido (${parseInt(pageviewsEl.value, 10).toLocaleString("pt-BR")} views)`,
      `${r.energy.isNetPositive ? "+" : ""}${fmtEnergy(r.energy.totalNetBalanceWh)} (${r.energy.totalNetCo2Grams.toFixed(3).replace(".", ",")} gCO₂e)`,
      r.energy.isNetPositive ? "good" : "err"
    ),
    ...row(
      "Break-even (Ponto de Equilíbrio)",
      isFinite(r.energy.breakEvenViews)
        ? `${r.energy.breakEvenViews.toLocaleString("pt-BR")} acessos para pagar custo de CPU`
        : "Inviável (custo de decodificação > economia de rede)",
      isFinite(r.energy.breakEvenViews) ? "good" : "bad"
    )
  );

  const ext = r.targetMime === "image/avif" ? ".avif" : ".webp";
  const a = document.createElement("a");
  a.className = "btn";
  a.textContent = `Baixar ${outLabel}`;
  a.href = track(URL.createObjectURL(r.blob));
  a.download = r.name.replace(/\.[^.]+$/, "") + ext;

  body.append(h, dl, a);
  el.append(th, body);
  listEl.append(el);
}

function renderTotals(rs) {
  const ok = rs.filter(r => r.smaller);
  const saved = ok.reduce((s, r) => s + r.saved, 0);
  const orig = rs.reduce((s, r) => s + r.orig, 0);
  const netWh = rs.reduce((s, r) => s + r.energy.totalNetBalanceWh, 0);
  const netCo2 = rs.reduce((s, r) => s + r.energy.totalNetCo2Grams, 0);

  const items = [
    [fmt(saved), "economizados por carregamento"],
    [orig ? (saved / orig * 100).toFixed(1).replace(".", ",") + "%" : "0%", "redução média de payload"],
    [(netWh >= 0 ? "+" : "") + fmtEnergy(netWh), "balanço energético líquido"],
    [(netCo2 >= 0 ? "+" : "") + netCo2.toFixed(2).replace(".", ",") + " g", "CO₂e líquido na escala"]
  ];

  totalsEl.replaceChildren(...items.map(([v, l]) => {
    const d = document.createElement("div"); d.className = "stat";
    const b = document.createElement("b"); b.textContent = v;
    const s = document.createElement("span"); s.textContent = l;
    d.append(b, s);
    return d;
  }));
  totalsEl.style.display = "grid";
}

async function run(files) {
  if (!files.length) return;
  if (!appReady) { setStatus("O núcleo WebAssembly ainda está carregando, aguarde..."); return; }
  lastFiles = files;
  const me = ++runId;
  urls.forEach(u => URL.revokeObjectURL(u));
  urls = [];
  listEl.replaceChildren();
  totalsEl.style.display = "none";

  const results = [];
  for (let i = 0; i < files.length; i++) {
    setStatus(`Otimizando e auditando ${i + 1} de ${files.length} (Busca Binária Perceptual)…`);
    await new Promise(r => setTimeout(r, 0));
    if (me !== runId) return;
    try {
      const r = await processFile(files[i]);
      results.push(r);
      render(r);
    } catch (e) {
      const el = document.createElement("article"); el.className = "item"; el.style.gridTemplateColumns = "1fr";
      const p = document.createElement("p"); p.className = "err"; p.textContent = `${files[i].name}: ${e?.message ?? e}`;
      el.append(p); listEl.append(el);
    }
  }
  if (results.length) renderTotals(results);
  setStatus(results.length ? "Auditoria concluída." : "Nenhuma imagem pôde ser processada.", results.length ? "" : "error");
}

// --- EVENTOS DE AUDITORIA VIA CRAWLER ---
btnAudit.addEventListener("click", async () => {
  const url = auditUrlEl.value.trim();
  if (!url) { setStatus("Digite uma URL válida para auditar.", "error"); return; }

  btnAudit.disabled = true;
  crawlSummaryEl.style.display = "none";
  setStatus(`Iniciando Headless Chromium (${crawlViewportEl.value}) e interceptando imagens de ${url}…`);

  try {
    const resp = await fetch("/api/audit-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, device: crawlViewportEl.value }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Erro desconhecido no crawler.");

    crawlSummaryEl.innerHTML = `
      <strong>Diagnóstico da Página Real (${data.device.toUpperCase()}):</strong>
      Carregamento total: <b>${data.loadTimeMs} ms</b> ·
      LCP (Largest Contentful Paint): <b>${data.lcpMs} ms</b> ·
      Imagens JPEG/PNG interceptadas: <b>${data.totalImages}</b> (${fmt(data.totalImageBytes)})
    `;
    crawlSummaryEl.style.display = "block";

    if (!data.images.length) {
      setStatus("Nenhuma imagem JPEG ou PNG (> 1 KB) encontrada nesta página.");
      return;
    }

    // Converte os buffers base64 capturados pelo Playwright em objetos File reais
    const crawledFiles = data.images.map(img => {
      const binStr = atob(img.base64);
      const arr = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) arr[i] = binStr.charCodeAt(i);
      return new File([arr], img.name, { type: img.mimeType });
    });

    await run(crawledFiles);
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    btnAudit.disabled = false;
  }
});

// --- EVENTOS DE UPLOAD E PARÂMETROS ---
targetSsimEl.addEventListener("input", () => {
  ssimValEl.textContent = parseFloat(targetSsimEl.value).toFixed(2).replace(".", ",");
});
[targetSsimEl, codecEl, deviceProfileEl, pageviewsEl, lossyEl].forEach(el => {
  el.addEventListener("change", () => { if (lastFiles.length) run(lastFiles); });
});

const ok = f => /^image\/(jpeg|png)$/.test(f.type);
drop.addEventListener("click", () => fileEl.click());
drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileEl.click(); } });
fileEl.addEventListener("change", () => run([...fileEl.files].filter(ok)));
["dragenter", "dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => {
  crawlSummaryEl.style.display = "none";
  const fs = [...e.dataTransfer.files], good = fs.filter(ok);
  if (good.length < fs.length) setStatus("Apenas JPEG e PNG são aceitos; os demais foram ignorados.");
  run(good);
});