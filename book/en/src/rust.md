# Using it from Rust

The crate is built as both a WebAssembly library and a normal Rust library (`rlib`), so you can
call the same functions from Rust code, for example in a command-line tool.

## Example

This example uses only the standard library to read and write files:

```rust,ignore
use eco_pixel::{convert_image_to_webp_auto, ImageInput};

fn main() {
    // Read any supported image file from disk.
    let bytes: Vec<u8> = std::fs::read("photo.png").expect("could not read photo.png");

    let input = ImageInput::from_bytes(bytes).expect("not a recognised image");
    let mut outcome = convert_image_to_webp_auto(&input, true).expect("conversion failed");

    println!("{} -> {} bytes", outcome.original_bytes(), outcome.webp_bytes());
    println!("~{:.6} g CO2e saved (estimate)", outcome.co2_saved_grams());

    // Keep the WebP only when it is actually smaller than the original.
    if outcome.is_smaller() {
        std::fs::write("photo.webp", outcome.data()).expect("could not write photo.webp");
    } else {
        println!("The WebP is not smaller, keep the original file.");
    }
}
```

## Differences from JavaScript

- Getters are plain methods: `outcome.is_smaller()` in Rust, `outcome.is_smaller` in
  JavaScript.
- `outcome.data()` takes `&mut self`, because the bytes are moved out. It can be called once;
  later calls return an empty `Vec`.
- Nothing needs to be freed. Rust drops the values when they go out of scope.

## Errors work best in the browser

Functions that can fail return `Result<_, JsError>`. A `JsError` can only be created inside
WebAssembly. When the crate runs as a normal native program, a failing call, such as passing
bytes that are not an image, **panics** instead of returning an `Err`. The success path works
normally on native targets. See [Limitations](limitations.md).
