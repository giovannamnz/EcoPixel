# Core concepts

There are three things to know: the input, the preview and the outcome.

## ImageInput

`ImageInput` wraps the raw bytes of an image file and remembers which format they are.

```js
const input = ImageInput.from_bytes(new Uint8Array(await file.arrayBuffer()));
console.log(input.format);      // for example "Png", "Jpeg", "Gif", "WebP"
console.log(input.byte_length); // size in bytes
```

If you have the image as a data URL (`data:image/png;base64,...`), use
`ImageInput.from_data_url(url)` instead. When you start from a `File`, prefer `from_bytes`: it
skips the base64 step and its roughly 33% size overhead.

Creating an `ImageInput` only detects the format. The pixels are decoded later, during
conversion. A corrupt image can therefore pass this step and fail at conversion.

The same `ImageInput` can be used for several calls, for example a preview followed by a
conversion, or conversions with lossy on and off.

## The preview

`preview_webp_conversion(input, allowLossy)` returns a quick forecast without encoding
anything. It reads only the header of the image, so it is fast even for large files.

It tells you the dimensions, whether the source is already lossy, the estimated quality of a
JPEG, whether the image is animated, and a rough guess of the WebP size, with a `confidence`
of `"low"` or `"medium"`.

The size guess comes from fixed ratios per format, not from real encoding. Use it to show an
estimate or to decide whether a conversion is worth running, and rely on the outcome for real
numbers.

## The outcome

`convert_image_to_webp_auto(input, allowLossy)` does the conversion and returns an outcome. It
holds:

- the WebP file (`data`),
- sizes: `original_bytes`, `webp_bytes` and `bytes_saved`,
- the image `width` and `height`,
- how it was encoded: `mode` (`"lossy"` or `"lossless"`), `quality`, `animated` and
  `frame_count`,
- `is_smaller`, which tells you whether the WebP beat the original,
- `co2_saved_grams`, the estimated CO₂ saved.

Always check `is_smaller` before uploading the WebP. When it is `false`, the original file is
the better choice, and `bytes_saved` and `co2_saved_grams` are `0`.
