# Quick start (JavaScript)

This page is a complete example: pick an image, convert it to WebP, and show how much was
saved. It assumes you have built the package (see [Building the package](building.md)) and
that the `pkg/` folder sits next to your HTML file.

```html
<input id="file" type="file" accept="image/*">
<p id="result"></p>

<script type="module">
  import init, { ImageInput, convert_image_to_webp_auto } from "./pkg/eco_pixel.js";

  await init(); // load the WebAssembly module once

  document.getElementById("file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // 1. Wrap the file bytes.
      const bytes = new Uint8Array(await file.arrayBuffer());
      const input = ImageInput.from_bytes(bytes);

      // 2. Convert. `true` means lossy compression is allowed.
      const outcome = convert_image_to_webp_auto(input, true);

      // 3. Take the WebP bytes. Read `data` once.
      const webp = outcome.data;
      const blob = new Blob([webp], { type: "image/webp" });

      // 4. Upload the WebP only if it is really smaller.
      const toUpload = outcome.is_smaller ? blob : file;
      // await fetch("/upload", { method: "POST", body: toUpload });

      document.getElementById("result").textContent =
        `${outcome.original_bytes} -> ${outcome.webp_bytes} bytes ` +
        `(${outcome.mode}), about ${outcome.co2_saved_grams.toFixed(4)} g CO2e saved`;
    } catch (e) {
      document.getElementById("result").textContent = `Conversion failed: ${e.message ?? e}`;
    }
  });
</script>
```

## What happened

- `init()` downloads and starts the WebAssembly module. Call it once, before anything else.
- `ImageInput.from_bytes` checks which image format the file is.
- `convert_image_to_webp_auto(input, true)` does the conversion. The second argument says
  whether lossy compression is allowed; see [Lossy or lossless?](lossy-lossless.md).
- `outcome.data` holds the WebP file. It can be read only once; see
  [Memory and free()](memory.md).
- `outcome.is_smaller` tells you whether converting actually helped. A WebP is not always
  smaller than the original, so upload the original when it is `false`.

## Showing an estimate first

To show a rough size before converting, call `preview_webp_conversion`. It reads only the
file header and does not encode anything:

```js
import { preview_webp_conversion } from "./pkg/eco_pixel.js";

const preview = preview_webp_conversion(input, true);
console.log(preview.estimated_webp_bytes, preview.confidence);
```

The numbers come from fixed rules of thumb per format, so treat them as a guess.

## Keep the page responsive

Conversion is a normal synchronous call, so a large image can freeze the page for a moment.
For big images, load the module and run the conversion inside a
[Web Worker](https://developer.mozilla.org/docs/Web/API/Web_Workers_API), and pass the bytes
to it with `postMessage`.
