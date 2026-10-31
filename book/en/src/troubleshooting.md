# Errors and troubleshooting

## Messages thrown by the library

| Message starts with | Meaning |
|---|---|
| `unknown format:` | The bytes are not a recognised image format. Check that you passed the file contents. |
| `data url has no comma separator` | The string is not a data URL. It should look like `data:image/png;base64,...`. |
| `invalid base64:` | The part after the comma is not valid standard base64 (padding is required). |
| `header read failed:` | The image header could not be read while previewing. The file may be corrupt or in an unsupported variant of its format. |
| `decode failed:` | The image could not be decoded. The file may be corrupt or use a feature the decoder does not support. |
| `gif decode failed:` | The GIF could not be read or converted, for example because it has no frames or a frame has no color palette. |
| `webp encode failed:` | The WebP encoder reported an error. |

## Common problems

**The module fails to load.**
Serve the page over HTTP instead of opening it with `file://`, and make sure `.wasm` files are
sent as `application/wasm`. See [Building the package](building.md).

**An error about something being undefined right at the start.**
Make sure you `await init()` once before calling anything else.

**`RuntimeError: unreachable`.**
This is how a Rust panic looks in WebAssembly. The library installs a panic hook, so the
actual panic message is printed in the browser console: open the developer tools and read the
first error. After a panic the WebAssembly module can be left in an inconsistent state, so
reload the page before trying again, and avoid calling `free()` on objects that were in use
when it happened.

**`outcome.data` is empty.**
It was already read. `data` can be read only once; keep the first result in a variable. See
[Memory and free()](memory.md).

**The WebP is bigger than the original.**
This happens, especially for lossless WebP made from a JPEG. Check `outcome.is_smaller` and
upload the original file when it is `false`. Passing `true` for `allowLossy` usually avoids it
for photos.

**The page freezes during conversion.**
Conversion is synchronous. Run it in a Web Worker for large images; see the
[Quick start](quick-start.md).

**The preview was far from the real size.**
That is expected sometimes. The preview uses fixed ratios per format and never encodes
anything. Use the outcome for real numbers.
