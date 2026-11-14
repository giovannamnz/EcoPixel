# EcoPixel

EcoPixel converts images to [WebP](https://developers.google.com/speed/webp) **on the
visitor's device** and tells you how much CO₂ the smaller upload avoided.

It is written in Rust and compiled to WebAssembly, so a website can call it from JavaScript.
It can also be used as an ordinary Rust crate.

## Why convert in the browser?

Normally the browser uploads the original PNG or JPEG and the server converts it, if anything
converts it at all. If the browser converts the image first, a smaller file travels over the
network and the server has less to do. The amount of data that did not have to travel is what
the CO₂ figure is based on.

The figure is an **estimate**, not a measurement. See [The CO₂ estimate](co2.md) for exactly
what it counts.

## What it does

- Reads PNG, JPEG, GIF, BMP, TIFF and WebP files, given as bytes or as a data URL.
- Converts them to WebP: lossless, lossy, or picked automatically.
- Turns animated GIFs into animated WebP.
- Reports the original size, the new size, the bytes saved and the estimated CO₂ saved.
- Runs entirely on the visitor's device. Nothing is uploaded by the library.

## The flow in four steps

1. **Wrap the file** with `ImageInput`. This detects the format.
2. **Optionally preview** the conversion. It gives a quick size estimate without encoding.
3. **Convert** the image. You get the WebP bytes and the statistics.
4. **Use the result.** Upload the WebP, or the original file if the WebP turned out not to be
   smaller.

Continue with [Building the package](building.md), or jump to the
[Quick start](quick-start.md) if you already have the built package.
