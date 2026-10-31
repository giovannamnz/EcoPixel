# Lossy or lossless?

WebP can compress an image in two ways:

- **Lossless** keeps every pixel exactly as it was. Files are bigger.
- **Lossy** throws away some detail the eye barely notices. Files are much smaller, which
  suits photographs.

The `allowLossy` argument of `convert_image_to_webp_auto` is **permission** to use lossy
compression, not an order. With `false` the output is always lossless. With `true`, the
library decides based on the source:

| Source | `allowLossy = false` | `allowLossy = true` |
|---|---|---|
| JPEG | lossless | lossy, with a quality estimated from the JPEG itself (kept between 60 and 90) |
| Lossy WebP | lossless | lossy, quality 80 |
| PNG, BMP, TIFF, lossless WebP | lossless | lossless first; if that is at most 70% of the original size it is kept, otherwise a lossy version (quality 80) is also tried and the smaller of the two wins |
| GIF | animated lossy WebP (quality 75) | same; the flag has no effect |

## Which should I pass?

- **Photos and JPEGs:** pass `true`. A lossless WebP made from a JPEG is usually much bigger
  than the JPEG, so lossless defeats the purpose.
- **Screenshots, logos and graphics (PNG):** `true` is still fine. The library tries lossless
  first and only switches to lossy when lossless doesn't shrink the file enough.
- **Anything that must stay pixel-exact:** pass `false`.

Converting a JPEG to lossy WebP compresses an already-lossy image a second time, which can
add small extra artifacts. This is why the quality is estimated from the JPEG and kept within
a sensible range.

The `mode` and `quality` properties of the outcome tell you what was actually used.
