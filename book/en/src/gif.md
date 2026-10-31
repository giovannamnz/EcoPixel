# GIF and animation

Animated GIFs are converted into **animated WebP** files, which current major browsers can
display.

```js
const input = ImageInput.from_bytes(gifBytes);
const outcome = convert_image_to_webp_auto(input, true);

console.log(outcome.animated);    // true
console.log(outcome.frame_count); // number of frames
```

## How it works

- The WebP is always lossy, at a fixed quality of 75. The `allowLossy` flag has no effect on
  GIFs.
- Frames are drawn onto one canvas the size of the GIF, so frames that only update part of
  the picture, and transparent pixels, are handled.
- GIF stores frame delays in hundredths of a second. A delay of `0` is treated as 100 ms,
  because taking it literally would make the animation play as fast as possible.
- The outcome reports `quality` as `0` for GIFs, because the quality is a fixed internal
  value, not something estimated from the file.
- The preview reports `animated` as `true` for every GIF, including a GIF with one frame.

## Check your own GIFs

GIF support is basic. Always compare the result with the original on a few of your own GIFs
before relying on it. See [Limitations](limitations.md) for what is known to be rough.
