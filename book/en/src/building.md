# Building the package

EcoPixel is compiled to WebAssembly with [`wasm-pack`](https://rustwasm.github.io/wasm-pack/),
which also generates the JavaScript wrapper and the TypeScript type definitions.

## Prerequisites

You need a Rust toolchain, the WebAssembly target and `wasm-pack`:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

## Build

Run this in the crate's folder:

```bash
wasm-pack build --target web --release
```

The result is a `pkg/` folder containing:

| File | What it is |
|---|---|
| `eco_pixel_bg.wasm` | The compiled library |
| `eco_pixel.js` | JavaScript glue code; this is what you import |
| `eco_pixel.d.ts` | TypeScript types, including the documentation comments |
| `package.json` | Package metadata, so the folder can be published or installed |

Rebuild after every change to the Rust code, and hard-refresh the page (Ctrl+F5) so the
browser doesn't use a cached copy.

## Choosing a target

| `--target` | Use it for | Notes |
|---|---|---|
| `web` | Plain browsers, Vite, Web Workers | Call `await init()` once before using anything |
| `bundler` | Webpack, and bundlers with WebAssembly support | No `init()` call; needs a bundler that can import `.wasm` files |
| `nodejs` | Node.js scripts | Not useful for converting images in the visitor's browser |

This book uses `web`.

## Serving the files

Browsers refuse to load WebAssembly from a page opened with `file://`. Serve the folder over
HTTP with any static file server. For example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/`. The server must send `.wasm` files with the content type
`application/wasm`. Most static servers do this, and it is the first thing to check if the
module fails to load.
