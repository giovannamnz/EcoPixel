import init, {
  ImageInput,
  preview_webp_conversion,
  convert_image_to_webp_auto,
} from "../pkg/eco_pixel.js";

const $ = (id) => document.getElementById(id);
const fileEl = $("file");
const lossyEl = $("lossy");
const statusEl = $("status");
const statsEl = $("stats");
const origImg = $("orig-img");
const origPh = $("orig-ph");
const outImg = $("out-img");
const outPh = $("out-ph");
const downloadEl = $("download");

let ready = false;
let runId = 0;
let urls = [];

function setStatus(msg, kind = "") {
  statusEl.textContent = msg;
  statusEl.className = kind;
}

function fmtBytes(n) {
  if (n < 1024) return `${n} bytes`;
  const human =
    n < 1024 * 1024
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${human} (${n.toLocaleString()} bytes)`;
}

function track(url) {
  urls.push(url);
  return url;
}

function clearUrls() {
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls = [];
}

function showImage(img, placeholder, url) {
  img.src = url;
  img.hidden = false;
  placeholder.hidden = true;
}

function resetPanel(img, placeholder) {
  img.hidden = true;
  img.removeAttribute("src");
  placeholder.hidden = false;
}

// Some formats (TIFF, for example) can be converted but not shown by the browser.
origImg.addEventListener("error", () => {
  origImg.hidden = true;
  origPh.textContent = "Your browser can't preview this format";
  origPh.hidden = false;
});

function renderStats(rows) {
  const body = statsEl.querySelector("tbody");
  body.replaceChildren(
    ...rows.map(([label, value, cls]) => {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      const td = document.createElement("td");
      th.textContent = label;
      td.textContent = value;
      if (cls) td.className = cls;
      tr.append(th, td);
      return tr;
    })
  );
  statsEl.hidden = false;
}

async function run() {
  const file = fileEl.files[0];
  if (!file) return;
  if (!ready) {
    setStatus("WASM is still loading, try again in a moment.");
    return;
  }

  const myRun = ++runId;
  clearUrls();
  resetPanel(outImg, outPh);
  downloadEl.hidden = true;
  statsEl.hidden = true;

  showImage(origImg, origPh, track(URL.createObjectURL(file)));
  setStatus("Converting…");

  const bytes = new Uint8Array(await file.arrayBuffer());
  await new Promise((r) => setTimeout(r, 0)); // let the status text paint first
  if (myRun !== runId) return; // a newer pick replaced this one

  try {
    const allowLossy = lossyEl.checked;

    let input = ImageInput.from_bytes(bytes);
    let preview = preview_webp_conversion(input, allowLossy);

    const t0 = performance.now();
    let outcome = convert_image_to_webp_auto(input, allowLossy);
    const ms = performance.now() - t0;

    const webp = outcome.data; // read once: the getter hands the bytes over
    const blob = new Blob([webp], { type: "image/webp" });
    const outUrl = track(URL.createObjectURL(blob));
    showImage(outImg, outPh, outUrl);

    downloadEl.href = outUrl;
    downloadEl.download = file.name.replace(/\.[^.]+$/, "") + ".webp";
    downloadEl.hidden = false;

    const original = outcome.original_bytes;
    const webpBytes = outcome.webp_bytes;
    const saved = outcome.bytes_saved;
    const pct = original ? (saved / original) * 100 : 0;
    const co2mg = outcome.co2_saved_grams * 1000;

    let mode = outcome.mode;
    if (mode === "lossy" && outcome.quality) mode += ` (quality ${outcome.quality})`;
    if (outcome.animated) mode += `, animated (${outcome.frame_count} frames)`;

    let source = preview.format;
    if (preview.jpeg_quality != null) source += ` (estimated quality ${preview.jpeg_quality})`;

    renderStats([
      ["Source format", source],
      ["Dimensions", `${outcome.width} × ${outcome.height}`],
      ["Mode used", mode],
      ["Original size", fmtBytes(original)],
      ["WebP size", fmtBytes(webpBytes)],
      [
        "Bytes saved",
        outcome.is_smaller
          ? `${fmtBytes(saved)}, ${pct.toFixed(1)}% smaller`
          : "None. The WebP is larger, so you would upload the original.",
        outcome.is_smaller ? "good" : "bad",
      ],
      ["CO₂ saved (estimate)", `${co2mg.toFixed(3)} mg CO₂e`],
      [
        "Preview guess",
        `${fmtBytes(preview.estimated_webp_bytes)}, ${preview.confidence} confidence`,
      ],
      ["Convert time", `${ms.toFixed(1)} ms`],
    ]);
    setStatus("Done.");
  } catch (e) {
    setStatus(`Conversion failed: ${e?.message ?? e}`, "error");
  }
}

fileEl.addEventListener("change", run);
lossyEl.addEventListener("change", run);

init()
  .then(() => {
    ready = true;
    setStatus("Ready. Pick an image.");
    if (fileEl.files[0]) run(); // the browser may restore the file input after a reload
  })
  .catch((e) => setStatus(`Could not load the WASM module: ${e}`, "error"));
