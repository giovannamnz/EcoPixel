# Limitations

Things to know before you rely on EcoPixel.

## The CO₂ number is an estimate

It is built from averages and counts only the avoided network transfer. It ignores the energy
spent on the visitor's device. See [The CO₂ estimate](co2.md).

## A WebP is not always smaller

Lossless WebP made from a JPEG is usually much bigger than the JPEG, and some images simply
do not shrink. Always check `is_smaller`. How much lossy WebP saves compared with JPEG depends
on the image and on how well the JPEG was compressed in the first place; do not assume a fixed
percentage. Measure with your own images.

## The preview is a guess

`preview_webp_conversion` uses fixed rules of thumb per format. It is meant for a rough
indication only.

## Lossy settings are fixed

You choose whether lossy is allowed, but not the quality. The library picks it: estimated from
the file for JPEGs (kept between 60 and 90), 80 for other lossy conversions and 75 for GIFs.

## GIF support is basic

- Frames are drawn onto a canvas, but the GIF "disposal method" setting, which says what to do
  with a frame's area before the next frame, is not applied precisely in the order the GIF
  specification describes. Some GIFs that rely on it may not look identical.
- The last frame of the animation is shown for as long as the first frame, instead of using its
  own delay.

Test with your own GIFs before depending on the result.

## Errors on native Rust targets

Errors are `JsError` values, which can only be created inside WebAssembly. On a native target,
a failing call panics instead of returning an `Err`. Use the crate from Rust mainly for the
success path, or validate input before calling it. See [Using it from Rust](rust.md).

## One thread, no resizing

Conversion runs on one thread and blocks until it finishes. The library only converts
formats; it does not resize or crop images, so downscale very large images yourself if you do
not need the full resolution.
