# JavaScript API

Everything is exported from `pkg/eco_pixel.js`. TypeScript definitions are generated in
`pkg/eco_pixel.d.ts`.

```js
import init, {
  ImageInput,
  preview_webp_conversion,
  convert_image_to_webp_auto,
} from "./pkg/eco_pixel.js";
```

## init()

The default export. Loads the WebAssembly module. Call `await init()` once before anything
else.

## ImageInput

| Member | Description |
|---|---|
| `ImageInput.from_bytes(bytes: Uint8Array)` | Wraps the bytes of an image file and detects the format. Throws if the format is not recognised. |
| `ImageInput.from_data_url(url: string)` | Wraps an image given as a data URL. Everything after the first comma is decoded as standard base64. Throws if there is no comma, the base64 is invalid, or the format is not recognised. |
| `input.format` | Detected format name, such as `"Png"`, `"Jpeg"`, `"Gif"` or `"WebP"`. |
| `input.byte_length` | Size of the input in bytes. |
| `input.bytes` | A copy of the input bytes. Slow for large files; avoid it in loops. |
| `input.free()` | Optional. Releases the memory immediately. |

## preview_webp_conversion(input, allowLossy)

Returns a forecast of the conversion without encoding anything. Throws if the image header
can't be read.

| Property | Description |
|---|---|
| `format` | Detected source format. |
| `width`, `height` | Image size in pixels, read from the header. |
| `is_lossy` | `true` for JPEG and lossy WebP, `false` for GIF and lossless WebP, `undefined` when it can't be told (PNG, BMP, TIFF, and others). |
| `jpeg_quality` | Estimated quality (1-100) of a JPEG. `undefined` for other formats. |
| `animated` | `true` for GIF input. |
| `estimated_webp_bytes` | Rough guess of the WebP size in bytes. |
| `estimated_ratio` | Guessed WebP size divided by the original size. Above 1 means probably bigger. |
| `likely_smaller` | `true` when `estimated_ratio` is below 1. |
| `confidence` | `"low"` or `"medium"`. |
| `predicted_mode` | `"lossy"` or `"lossless"`. Also a guess. |

## convert_image_to_webp_auto(input, allowLossy)

Converts the image and returns an outcome. See [Lossy or lossless?](lossy-lossless.md) for
how `allowLossy` is used. Throws if the image can't be decoded or encoded.

| Property | Description |
|---|---|
| `data` | The WebP file as a `Uint8Array`. **Read once**; later reads are empty. |
| `original_bytes` | Size of the original file in bytes. |
| `webp_bytes` | Size of the WebP file in bytes. |
| `width`, `height` | Image size in pixels. |
| `mode` | `"lossy"` or `"lossless"`. |
| `quality` | Lossy quality (0-100) used for a still image; `0` for lossless output and for GIFs. |
| `animated` | `true` when the output is an animated WebP. |
| `frame_count` | Number of frames; `1` for still images. |
| `is_smaller` | `true` when the WebP is strictly smaller than the original. |
| `bytes_saved` | `original_bytes - webp_bytes`, never below `0`. |
| `co2_saved_grams` | Estimated grams of CO₂e saved; see [The CO₂ estimate](co2.md). |
| `free()` | Optional. Releases the memory immediately. |

## Errors

Failures are thrown as ordinary JavaScript `Error` objects. Use `try`/`catch` and read
`e.message`. See [Errors and troubleshooting](troubleshooting.md) for the messages you may
see.
