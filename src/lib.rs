//! # EcoPixel
//!
//! EcoPixel is a simple and direct tool to convert images into Webp. With the objective of
//! reducing the amount of CO2 emitions caused with each unoptimized picture in the web. It
//! currently supports `jpeg`, `png`, and `gif`.
//!
//! The recommended workflow goes like this.
//!
//! 1. Wrap the file bytes with [`ImageInput::from_bytes`] (or [`ImageInput::from_data_url`]).
//!    This detects the format.
//! 2. Optionally call [`preview_webp_conversion`] for a quick estimate without encoding anything.
//!    (Highly recommended as it allows to prevent wasting processing power.)
//! 3. Call [`convert_image_to_webp_auto`]. It returns a [`WebpConversionOutcome`] holding the
//!    WebP bytes and statistics: bytes saved, CO2 saved and so on.
//!
//! ## Using it from JavaScript
//!
//! Build the package with `wasm-pack build --target web --release`, then:
//!
//! ```js
//! import init, { ImageInput, convert_image_to_webp_auto } from "./pkg/eco_pixel.js";
//!
//! await init(); // load the WebAssembly module once
//!
//! const file = document.querySelector("input[type=file]").files[0];
//! const bytes = new Uint8Array(await file.arrayBuffer());
//!
//! const input = ImageInput.from_bytes(bytes);
//! const outcome = convert_image_to_webp_auto(input, true); // true = lossy is allowed
//!
//! const webp = outcome.data; // read this once, see WebpConversionOutcome::data
//! const blob = new Blob([webp], { type: "image/webp" });
//!
//! // Only upload the WebP when it is actually smaller.
//! const toUpload = outcome.is_smaller ? blob : file;
//!
//! console.log(`${outcome.original_bytes} -> ${outcome.webp_bytes} bytes`);
//! console.log(`~${outcome.co2_saved_grams.toFixed(4)} g CO2e saved (estimate)`);
//!
//! // Optional: release the WebAssembly memory right away instead of waiting for the garbage
//! // collector (see "Memory" below).
//! // Might lead to some problems when converting Gifs.
//! input.free();
//! outcome.free();
//! ```
//!
//! ## Using it from Rust
//!
//! Despite the lib main target is being used alongside javascript, it is still possible to
//! use it as a Rust crate.
//!
//! ```rust,no_run
//! use eco_pixel::{convert_image_to_webp_auto, ImageInput};
//!
//! // Read any supported image file from disk.
//! let bytes: Vec<u8> = std::fs::read("photo.png").expect("could not read photo.png");
//!
//! let input = ImageInput::from_bytes(bytes).expect("not a recognised image");
//! let mut outcome = convert_image_to_webp_auto(&input, true).expect("conversion failed");
//!
//! println!("{} -> {} bytes", outcome.original_bytes(), outcome.webp_bytes());
//! println!("~{:.6} g CO2e saved (estimate)", outcome.co2_saved_grams());
//!
//! // Keep the WebP only when it is actually smaller than the original.
//! // Often you would use it with a preview_webp_conversion() first to avoid the convertion.
//! if outcome.is_smaller() {
//!     std::fs::write("photo.webp", outcome.data()).expect("could not write photo.webp");
//! } else {
//!     println!("The WebP is not smaller, keep the original file.");
//! }
//! ```
//!
//! ## Lossy or lossless?
//!
//! The `allow_lossy` argument of [`convert_image_to_webp_auto`] is permission to use lossy
//! compression, not an order. What actually happens:
//!
//! | Source | `allow_lossy = false` | `allow_lossy = true` |
//! |---|---|---|
//! | JPEG | lossless | lossy, quality estimated from the JPEG itself (clamped to 60-90) |
//! | Lossy WebP | lossless | lossy, quality 80 |
//! | PNG, BMP, TIFF, lossless WebP | lossless | lossless first; if that is at most 70% of the original size it is kept, otherwise lossy (quality 80) is also tried and the smaller result wins |
//! | GIF | animated lossy WebP (quality 75) | same, the flag has no effect |
//!
//! Lossless WebP made from a JPEG is usually much *bigger* than the JPEG, which is why
//! `allow_lossy` matters for photos.
//!
//! ## How the CO2 estimate works
//!
//! ```text
//! co2_saved_grams = bytes_saved / 1e9 (GB) x 0.81 (kWh per GB) x 442 (g CO2e per kWh)
//! ```
//!
//! That is roughly 0.36 g of CO2e for every megabyte that did not have to be uploaded.
//!
//! The constants follow the style of the Sustainable Web Design model; check them against the
//! current version of that model before quoting the numbers anywhere. The figure is an
//! **estimate**, not a measurement. It counts only the network transfer that was avoided, not
//! the energy the visitor's device spends doing the conversion, and it is `0` whenever the WebP
//! is not smaller than the original.

use image::{DynamicImage, ImageFormat, RgbImage, RgbaImage};
use std::io::Cursor;
use wasm_bindgen::prelude::*;
use zenwebp::{EncodeRequest, LosslessConfig, LossyConfig, PixelLayout};
use console_error_panic_hook;

/// Runs automatically when the WebAssembly module is loaded.
///
/// Installs a panic hook that prints Rust panic messages to the browser console. Without it, a
/// panic shows up only as an unhelpful `RuntimeError: unreachable.
#[wasm_bindgen(start)]
fn init() {
    console_error_panic_hook::set_once();
}

#[cfg(test)]
mod tests;

/// Constants. These are mostly used to determine how much we saved,
/// and to determine if a possible conversion should be either lossy or lossles.

const KWH_PER_GB: f64 = 0.81;
const GRID_G_CO2_PER_KWH: f64 = 442.0;
const BYTES_PER_GB: f64 = 1_000_000_000.0;

const LOSSY_FALLBACK_QUALITY: u8 = 80;
const LOSSLESS_GOOD_ENOUGH: f64 = 0.70;
const MIN_LOSSY_QUALITY: u8 = 60;
const MAX_LOSSY_QUALITY: u8 = 90;

fn estimate_transfer_co2_grams(bytes: u32) -> f64 {
	bytes as f64 / BYTES_PER_GB * KWH_PER_GB * GRID_G_CO2_PER_KWH
}

/// Luminance patter for jpeg. We use it how much lossy a jpeg is.
const STD_LUMA: [u32; 64] = [
	16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69,
	56, 14, 17, 22, 29, 51, 87, 80, 62, 18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104,
	113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
];

/// ImageInput is the most simpler, and yet important struct we have.
/// It simplifies the method we use on reading images so we don't need to use bytes directly,
/// plus the format is detected from them.
///
/// Create one with [`ImageInput::from_bytes`] (for example from a `File` read into a
/// `Uint8Array`) or [`ImageInput::from_data_url`], then pass it by reference to
/// [`preview_webp_conversion`] and [`convert_image_to_webp_auto`]. The same input can be reused
/// for several calls.
///
/// It keeps a copy of the file bytes in WebAssembly memory. That memory is released when the
/// JavaScript object is garbage collected; call `free()` to release it sooner.
#[wasm_bindgen]
pub struct ImageInput {
	bytes: Vec<u8>,
	format: ImageFormat,
}

#[wasm_bindgen]
impl ImageInput {
	/// Wraps the bytes of an image file and detects the format from the file's leading bytes.
	///
	/// Only the format is checked here. Pixels are not decoded until the conversion, so a corrupt
	/// image can still fail later.
	///
	/// From JavaScript: `ImageInput.from_bytes(new Uint8Array(await file.arrayBuffer()))`.
	///
	/// # Errors
	///
	/// Fails (as a JavaScript `Error` in the browser) when the format is not recognised.
	#[wasm_bindgen(js_name = from_bytes)]
	pub fn from_bytes(bytes: Vec<u8>) -> Result<ImageInput, JsError> {
		let format: ImageFormat = image::guess_format(&bytes)
			.map_err(|e: image::ImageError| e)
			.map_err(|e: image::ImageError| JsError::new(&format!("unknown format: {e}")))?;

		Ok(ImageInput { bytes, format })
	}

	/// Wraps an image given as a data URL, such as `data:image/png;base64,iVBORw0KGgo...`.
	///
	/// Everything after the first comma is decoded as standard base64 (padding is required and the
	/// URL-safe alphabet is not accepted). The `data:...;base64` header is not validated; the format
	/// is detected from the decoded bytes, exactly as in [`ImageInput::from_bytes`].
	///
	/// When you start from a `File`, prefer `from_bytes`: it skips the decoding step and the roughly
	/// 33% size overhead of base64.
	///
	/// # Errors
	///
	/// Fails when the string has no comma, the payload is not valid base64, or the decoded bytes are
	/// not a recognised image format.
	#[wasm_bindgen(js_name = from_data_url)]
	pub fn from_data_url(data_url: &str) -> Result<ImageInput, JsError> {
		let payload: &str = data_url
			.split_once(',')
			.map(|(_head, body): (&str, &str)| body)
			.ok_or_else(|| JsError::new("data url has no comma separator"))?;

		let bytes: Vec<u8> = decode_base64(payload)
			.map_err(|e: String| JsError::new(&format!("invalid base64: {e}")))?;

		ImageInput::from_bytes(bytes)
	}

	///Returns the format of the image.
	#[wasm_bindgen(getter)]
	pub fn format(&self) -> String {
		format!("{:?}", self.format)
	}

	///Returns the amount of bytes inside the image.
	#[wasm_bindgen(getter)]
	pub fn byte_length(&self) -> u32 {
		self.bytes.len() as u32
	}

	/// Returns a copy of the input bytes.
	///
	/// This clones the whole buffer on every call, so avoid it in loops. The conversion functions read
	/// the bytes directly and do not need it.
	#[wasm_bindgen(getter)]
	pub fn bytes(&self) -> Vec<u8> {
		self.bytes.clone()
	}
}

impl ImageInput {

	/// Borrows the input bytes without copying them. Rust only; not exported to JavaScript.
	///
	/// The borrow lasts as long as the `ImageInput` does. When you need ownership, use `bytes()`.
	pub fn as_bytes(&self) -> &[u8] {
		&self.bytes
	}

	/// The format found by `from_bytes`. Rust only; not exported to JavaScript.
	pub fn detected_format(&self) -> ImageFormat {
		self.format
	}
}


fn decode_base64(s: &str) -> Result<Vec<u8>, String> {
	fn val(c: u8) -> Option<u8> {
		match c {
			b'A'..=b'Z' => Some(c - b'A'),
			b'a'..=b'z' => Some(c - b'a' + 26),
			b'0'..=b'9' => Some(c - b'0' + 52),
			b'+' => Some(62),
			b'/' => Some(63),
			_ => None,
		}
	}

	let clean: Vec<u8> = s
		.bytes()
		.filter(|b: &u8| !b.is_ascii_whitespace())
		.collect();

	if clean.len() % 4 != 0 {
		return Err("length not a multiple of 4".to_string());
	}

	let mut out: Vec<u8> = Vec::with_capacity(clean.len() / 4 * 3);

	let mut chunk: usize = 0;
	while chunk < clean.len() {
		let c0: u8 = clean[chunk];
		let c1: u8 = clean[chunk + 1];
		let c2: u8 = clean[chunk + 2];
		let c3: u8 = clean[chunk + 3];

		let v0: u8 = val(c0).ok_or_else(|| format!("bad char {c0}"))?;
		let v1: u8 = val(c1).ok_or_else(|| format!("bad char {c1}"))?;

		out.push((v0 << 2) | (v1 >> 4));

		if c2 != b'=' {
			let v2: u8 = val(c2).ok_or_else(|| format!("bad char {c2}"))?;
			out.push(((v1 & 0x0F) << 4) | (v2 >> 2));

			if c3 != b'=' {
				let v3: u8 = val(c3).ok_or_else(|| format!("bad char {c3}"))?;
				out.push(((v2 & 0x03) << 6) | v3);
			}
		}

		chunk += 4;
	}

	Ok(out)
}


// ---------------------------------------------------------------------------
// JPEG quality estimation
// ---------------------------------------------------------------------------

fn read_jpeg_luma_quant_sum(d: &[u8]) -> Option<u32> {
	let mut i: usize = 2;

	while i + 4 <= d.len() {
		if d[i] != 0xFF {
			return None;
		}

		let marker: u8 = d[i + 1];

		if marker == 0xFF {
			i += 1;
			continue;
		}

		if marker == 0x01 || (0xD0..=0xD8).contains(&marker) {
			i += 2;
			continue;
		}

		if marker == 0xDA {
			return None;
		}

		let len: usize = u16::from_be_bytes([d[i + 2], d[i + 3]]) as usize;

		if marker == 0xDB {
			let end: usize = (i + 2 + len).min(d.len());
			let mut p: usize = i + 4;

			while p < end {
				let pq: u8 = d[p] >> 4;
				let tq: u8 = d[p] & 0x0F;
				p += 1;

				let size: usize = if pq == 0 { 1 } else { 2 };

				if p + 64 * size > end {
					return None;
				}

				if tq == 0 {
					let sum: u32 = (0..64)
						.map(|k: usize| {
							if pq == 0 {
								d[p + k] as u32
							} else {
								u16::from_be_bytes([d[p + 2 * k], d[p + 2 * k + 1]]) as u32
							}
						})
						.sum();

					return Some(sum);
				}

				p += 64 * size;
			}
		}

		i += 2 + len;
	}

	None
}


fn infer_jpeg_quality_from_quant_sum(sum: u32) -> u8 {
	let mut scaled_sums: [u32; 100] = [0u32; 100];

	let mut q: u32 = 1;
	while q <= 100 {
		let scale: u32 = if q < 50 { 5000 / q } else { 200 - 2 * q };

		let s: u32 = STD_LUMA
			.iter()
			.map(|&b: &u32| ((b * scale + 50) / 100).clamp(1, 255))
			.sum();

		scaled_sums[(q - 1) as usize] = s;
		q += 1;
	}

	let mut best_q: u8 = 1;
	let mut best_diff: u32 = u32::MAX;

	let mut i: usize = 0;
	while i < 100 {
		let diff: u32 = scaled_sums[i].abs_diff(sum);

		if diff < best_diff {
			best_diff = diff;
			best_q = (i + 1) as u8;
		}

		i += 1;
	}

	best_q
}


fn detect_webp_is_lossy(d: &[u8]) -> Option<bool> {
	if d.len() < 16 || &d[0..4] != b"RIFF" || &d[8..12] != b"WEBP" {
		return None;
	}

	let mut p: usize = 12;

	while p + 8 <= d.len() {
		let size: usize = u32::from_le_bytes(d[p + 4..p + 8].try_into().ok()?) as usize;

		match &d[p..p + 4] {
			b"VP8 " => return Some(true),
			b"VP8L" => return Some(false),
			_ => {}
		}

		p += 8 + size + (size & 1);
	}

	None
}


/// This calculates the delay for a given gif. It helps us determine how many frames per
/// second we use.
fn gif_delay_to_ms(delay_cs: u16) -> u32 {
	if delay_cs == 0 {
		100
	} else {
		delay_cs as u32 * 10
	}
}


// ---------------------------------------------------------------------------
// WebP encoding — still images
// ---------------------------------------------------------------------------

fn encode_webp_lossless(img: &DynamicImage) -> Result<Vec<u8>, String> {
	let (w, h): (u32, u32) = (img.width(), img.height());

	if img.color().has_alpha() {
		let buf: RgbaImage = img.to_rgba8();
		let config: LosslessConfig = LosslessConfig::new();

		EncodeRequest::lossless(&config, buf.as_raw(), PixelLayout::Rgba8, w, h)
			.encode()
			.map_err(|e| e.to_string())
	} else {
		let buf: RgbImage = img.to_rgb8();
		let config: LosslessConfig = LosslessConfig::new();

		EncodeRequest::lossless(&config, buf.as_raw(), PixelLayout::Rgb8, w, h)
			.encode()
			.map_err(|e| e.to_string())
	}
}


fn encode_webp_lossy(img: &DynamicImage, quality: u8) -> Result<Vec<u8>, String> {
	let (w, h): (u32, u32) = (img.width(), img.height());
	let q: f32 = quality as f32;

	if img.color().has_alpha() {
		let buf: RgbaImage = img.to_rgba8();
		let config: LossyConfig = LossyConfig::new().with_quality(q);

		EncodeRequest::lossy(&config, buf.as_raw(), PixelLayout::Rgba8, w, h)
			.encode()
			.map_err(|e| e.to_string())
	} else {
		let buf: RgbImage = img.to_rgb8();
		let config: LossyConfig = LossyConfig::new().with_quality(q);

		EncodeRequest::lossy(&config, buf.as_raw(), PixelLayout::Rgb8, w, h)
			.encode()
			.map_err(|e| e.to_string())
	}
}

/// Encodes a GIF directly into an animated WebP, streaming frames from the
/// decoder into zenwebp's animation encoder.
///
/// Returns `(webp_bytes, width, height, frame_count)`.
fn encode_gif_to_animated_webp(input: &[u8]) -> Result<(Vec<u8>, u32, u32, u32), String> {
	let mut opts: gif::DecodeOptions = gif::DecodeOptions::new();
	opts.set_color_output(gif::ColorOutput::Indexed);

	let mut decoder: gif::Decoder<Cursor<&[u8]>> = opts
		.read_info(Cursor::new(input))
		.map_err(|e: gif::DecodingError| e.to_string())?;

	let width = decoder.width() as u32;
	let height = decoder.height() as u32;

	let global_palette = decoder.global_palette().map(|p| p.to_vec());

	let config: zenwebp::mux::AnimationConfig =
		zenwebp::mux::AnimationConfig::default();

	let mut encoder: zenwebp::mux::AnimationEncoder =
		zenwebp::mux::AnimationEncoder::new(width, height, config)
			.map_err(|e| e.to_string())?;

	// Slightly tuned lossy quality to balance visual fidelity and massive size reduction
	let encoder_config: zenwebp::EncoderConfig =
		zenwebp::EncoderConfig::new_lossy().with_quality(75.0);

	let mut timestamp_ms: u32 = 0;
	let mut frame_count: u32 = 0;
	let mut first_delay_ms = 100;

	// Persistent canvas to carry over unchanging background pixels across frames
	let mut canvas = vec![0u8; (width * height * 4) as usize];

	// A backup of the canvas to support DisposalMethod::Previous
	let mut previous_canvas = canvas.clone();

	// While there are frames in the gif convert them.
	while let Some(frame) = decoder
		.read_next_frame()
		.map_err(|e: gif::DecodingError| e.to_string())?
	{
		if frame_count == 0 {
			first_delay_ms = gif_delay_to_ms(frame.delay);
		}

		// Save state before modifying if disposal is Previous
		if frame.dispose == gif::DisposalMethod::Previous {
			previous_canvas.copy_from_slice(&canvas);
		}

		let palette: &[u8] = match &frame.palette {
			Some(p) => p,
			None => global_palette
				.as_deref()
				.ok_or_else(|| "gif frame has no color palette".to_string())?,
		};

		let f_width = frame.width as usize;
		let f_height = frame.height as usize;
		let f_left = frame.left as usize;
		let f_top = frame.top as usize;
		let transparent_idx = frame.transparent;

		// Handle disposal of the *previous* frame's impact
		match frame.dispose {
			gif::DisposalMethod::Background => {
				for y in 0..f_height {
					let target_y = f_top + y;
					if target_y >= height as usize { break; }
					for x in 0..f_width {
						let target_x = f_left + x;
						if target_x >= width as usize { continue; }
						let target_idx = (target_y * width as usize + target_x) * 4;
						canvas[target_idx..target_idx + 4].copy_from_slice(&[0, 0, 0, 0]);
					}
				}
			}
			gif::DisposalMethod::Previous => {
				canvas.copy_from_slice(&previous_canvas);
			}
			_ => {}
		}


		for y in 0..f_height {
			let target_y = f_top + y;
			if target_y >= height as usize {
				break;
			}

			for x in 0..f_width {
				let target_x = f_left + x;
				if target_x >= width as usize {
					continue;
				}

				let src_idx = y * f_width + x;
				if src_idx >= frame.buffer.len() {
					break;
				}

				let color_index = frame.buffer[src_idx] as usize;
				
				if Some(color_index as u8) == transparent_idx {
					continue;
				}

				let palette_offset = color_index * 3;
				if palette_offset + 2 < palette.len() {
					let target_idx = (target_y * width as usize + target_x) * 4;
					canvas[target_idx]     = palette[palette_offset];     // R
					canvas[target_idx + 1] = palette[palette_offset + 1]; // G
					canvas[target_idx + 2] = palette[palette_offset + 2]; // B
					canvas[target_idx + 3] = 255;                         // A
				}
			}
		}

		encoder
			.add_frame(
				&canvas,
				PixelLayout::Rgba8,
				timestamp_ms,
				&encoder_config,
			)
			.map_err(|e| format!("{e:?}"))?;

		timestamp_ms += gif_delay_to_ms(frame.delay);
		frame_count += 1;
	}

	if frame_count == 0 {
		return Err("gif has no frames".to_string());
	}

	let data: Vec<u8> = encoder
		.finalize(first_delay_ms)
		.map_err(|e| format!("{e:?}"))?;

	Ok((data, width, height, frame_count))
}

fn decode_to_dynamic_image(
	input: &[u8],
	fmt: ImageFormat,
) -> Result<DynamicImage, String> {
	match fmt {
		ImageFormat::Gif => Err("gif must go through the animation path".to_string()),

		_ => image::load_from_memory_with_format(input, fmt)
			.map_err(|e: image::ImageError| e.to_string()),
	}
}

/// A cheap, header-only forecast of what converting an image would do. Produced by
/// [`preview_webp_conversion`].
///
/// Nothing is encoded to build it, so the size numbers come from fixed per-format ratios and are
/// rough guesses. Look at [`WebpConversionOutcome`] for the real result. It does not keep the
/// image data.
#[wasm_bindgen(getter_with_clone)]
pub struct WebpConversionPreview {
	/// Detected source format, the same string as [`ImageInput::format`].
	pub format: String,
	/// Image width in pixels, read from the file header.
	pub width: u32,
	/// Image height in pixels, read from the file header.
	pub height: u32,
	/// Whether the source is already lossy. `Some(true)` for JPEG and lossy WebP, `Some(false)` for
	/// GIF and lossless WebP, and `None` when it can't be told (PNG, BMP, TIFF, animated or
	/// unreadable WebP).
	pub is_lossy: Option<bool>,
	/// Estimated quality (1-100) of a JPEG source. `None` for other formats, or when the JPEG's
	/// quantization table can't be read.
	pub jpeg_quality: Option<u8>,
	/// `true` for GIF input (even a GIF with a single frame), `false` otherwise.
	pub animated: bool,
	/// Rough guess of the WebP size in bytes: the input size times `estimated_ratio`.
	pub estimated_webp_bytes: u32,
	/// Guessed WebP size divided by the original size. Below `1.0` means smaller. Above `1.0` the
	/// WebP would probably be bigger, for example lossless WebP made from a JPEG.
	pub estimated_ratio: f64,
	/// `true` when `estimated_ratio` is below `1.0`.
	pub likely_smaller: bool,
	/// How much to trust the guess: `"low"` or `"medium"`.
	pub confidence: String,
	/// `"lossy"` or `"lossless"`. This is a guess as well: for PNG, BMP and TIFF it says
	/// `"lossless"` even though, with `allow_lossy`, the converter may end up choosing lossy.
	pub predicted_mode: String,
}

/// Forecasts the result of [`convert_image_to_webp_auto`] without encoding anything.
///
/// Reads only the image header (for the dimensions) and a few format-specific details, so it is
/// fast even for large images. Use it to decide whether a conversion is worth running, or to show
/// an estimate in the interface. `allow_lossy` should be the value you will pass to the real
/// conversion.
///
/// The ratios behind the estimate are fixed rules of thumb per format, not measurements, so treat
/// the result as a guess (see [`WebpConversionPreview::confidence`]).
///
/// # Errors
///
/// Fails when the image header can't be read.
///
/// # Example (JavaScript)
///
/// ```js
/// const input = ImageInput.from_bytes(bytes);
/// const preview = preview_webp_conversion(input, true);
///
/// console.log(preview.estimated_webp_bytes, preview.confidence);
///
/// //Freeing the memory ahead of the garbage collector.
/// preview.free();
/// input.free();
/// ```
#[wasm_bindgen]
pub fn preview_webp_conversion(
	input: &ImageInput,
	allow_lossy: bool,
) -> Result<WebpConversionPreview, JsError> {
	let bytes: &[u8] = input.as_bytes();
	let fmt: ImageFormat = input.detected_format();

	let (width, height): (u32, u32) =
		image::ImageReader::with_format(Cursor::new(bytes), fmt)
			.into_dimensions()
			.map_err(|e: image::ImageError| {
				JsError::new(&format!("header read failed: {e}"))
			})?;

	let mut is_lossy: Option<bool> = None;
	let mut jpeg_quality: Option<u8> = None;
	let mut animated: bool = false;
	let mut mode: &str = "lossless";

	let (ratio, confidence): (f64, &str) = match fmt {
		ImageFormat::Jpeg => {
			is_lossy = Some(true);

			let q: Option<u8> = read_jpeg_luma_quant_sum(bytes)
				.map(infer_jpeg_quality_from_quant_sum);
			jpeg_quality = q;

			if allow_lossy {
				mode = "lossy";
				(0.75, "medium")
			} else {
				let r: f64 = match q {
					Some(q) if q >= 95 => 3.0,
					Some(q) if q >= 85 => 4.0,
					_ => 5.0,
				};

				(r, "medium")
			}
		}

		ImageFormat::Png => {
			if allow_lossy {
				(0.7, "low")
			} else {
				(0.75, "medium")
			}
		}

		ImageFormat::WebP => match detect_webp_is_lossy(bytes) {
			Some(true) => {
				is_lossy = Some(true);

				if allow_lossy {
					mode = "lossy";
					(0.9, "low")
				} else {
					(3.5, "medium")
				}
			}

			Some(false) => {
				is_lossy = Some(false);
				(1.0, "medium")
			}

			None => (1.0, "low"),
		},

		ImageFormat::Gif => {
			is_lossy = Some(false);
			animated = true;

			if allow_lossy {
				mode = "lossy";
				(0.6, "low")
			} else {
				(1.0, "low")
			}
		}

		ImageFormat::Bmp | ImageFormat::Tiff => (0.45, "low"),

		_ => (1.0, "low"),
	};

	let estimated: u32 = (bytes.len() as f64 * ratio) as u32;

	Ok(WebpConversionPreview {
		format: format!("{fmt:?}"),
		width,
		height,
		is_lossy,
		jpeg_quality,
		animated,
		estimated_webp_bytes: estimated,
		estimated_ratio: ratio,
		likely_smaller: ratio < 1.0,
		confidence: confidence.to_string(),
		predicted_mode: mode.to_string(),
	})
}

/// The result of [`convert_image_to_webp_auto`]: the WebP file bytes plus statistics about the
/// conversion, including the estimated CO2 saved.
///
/// From JavaScript, `free()` releases its memory right away; otherwise it is released when the
/// object is garbage collected.
#[wasm_bindgen]
pub struct WebpConversionOutcome {
	data: Vec<u8>,
	original_bytes: u32,
	webp_bytes: u32,
	width: u32,
	height: u32,
	lossy: bool,
	animated: bool,
	frame_count: u32,
	quality: u8,
}

#[wasm_bindgen]
impl WebpConversionOutcome {

	/// The converted WebP file.
	///
	/// The bytes are handed over, not copied: the first read returns the whole file and any later
	/// read returns an empty array. Read it once into a variable. The other getters keep working
	/// afterwards.
	#[wasm_bindgen(getter)]
	pub fn data(&mut self) -> Vec<u8> {
		std::mem::take(&mut self.data)
	}

	/// Size of the original input file in bytes.
	#[wasm_bindgen(getter)]
	pub fn original_bytes(&self) -> u32 {
		self.original_bytes
	}

	/// Size of the WebP file in bytes. Still correct after `data` has been read.
	#[wasm_bindgen(getter)]
	pub fn webp_bytes(&self) -> u32 {
		self.webp_bytes
	}

	/// Width of the image in pixels (for a GIF, the width of its logical screen).
	#[wasm_bindgen(getter)]
	pub fn width(&self) -> u32 {
		self.width
	}

	/// Height of the image in pixels (for a GIF, the height of its logical screen).
	#[wasm_bindgen(getter)]
	pub fn height(&self) -> u32 {
		self.height
	}

	/// Which encoder produced the result: `"lossy"` or `"lossless"`. Animated GIFs always report
	/// `"lossy"`.
	#[wasm_bindgen(getter)]
	pub fn mode(&self) -> String {
		if self.lossy {
			"lossy".into()
		} else {
			"lossless".into()
		}
	}

	/// `true` when the output is an animated WebP (often out of a GIF input).
	#[wasm_bindgen(getter)]
	pub fn animated(&self) -> bool {
		self.animated
	}

	/// Number of frames in the output. `1` for still images.
	#[wasm_bindgen(getter)]
	pub fn frame_count(&self) -> u32 {
		self.frame_count
	}

	/// Lossy quality (0-100) used for a still image. It is `0` when the output is lossless, and also
	/// `0` for animated GIFs, which are encoded at a fixed internal quality.
	#[wasm_bindgen(getter)]
	pub fn quality(&self) -> u8 {
		self.quality
	}

	/// `true` when the WebP is strictly smaller than the original file.
	///
	/// When it is `false`, keep and upload the original: converting did not help.
	#[wasm_bindgen(getter)]
	pub fn is_smaller(&self) -> bool {
		self.webp_bytes < self.original_bytes
	}

	/// Bytes saved by converting, that is `original_bytes - webp_bytes`, never below `0`.
	#[wasm_bindgen(getter)]
	pub fn bytes_saved(&self) -> u32 {
		self.original_bytes.saturating_sub(self.webp_bytes)
	}

	/// Estimated grams of CO2e avoided by transferring the WebP instead of the original. `0` when
	/// nothing was saved.
	///
	/// This is an estimate of the network transfer only. The crate-level documentation explains how
	/// it is calculated.
	#[wasm_bindgen(getter)]
	pub fn co2_saved_grams(&self) -> f64 {
		estimate_transfer_co2_grams(self.bytes_saved())
	}
}

/// Converts an image to WebP, choosing between lossy and lossless automatically.
///
/// `allow_lossy` is permission to use lossy compression. With `false` the output is always
/// lossless. With `true` the strategy depends on the source:
///
/// - **JPEG and lossy WebP**: encoded lossy. For a JPEG the quality is estimated from the file's
///   own quantization tables and clamped to 60-90. Other sources use 80.
/// - **PNG, BMP, TIFF and lossless WebP**: encoded lossless first. If that is at most 70% of the
///   original size it is kept. Otherwise a lossy version (quality 80) is also tried and the
///   smaller of the two wins.
/// - **GIF**: always converted to an animated lossy WebP (quality 75). `allow_lossy` has no
///   effect.
///
/// A WebP is not guaranteed to be smaller (lossless WebP made from a JPEG is usually much
/// bigger). Check [`WebpConversionOutcome::is_smaller`] and upload the original file when it is
/// `false`.
///
/// # Errors
///
/// Fails when the image can't be decoded (`"decode failed: ..."` or `"gif decode failed: ..."`)
/// or when encoding fails (`"webp encode failed: ..."`).
///
/// # Example (JavaScript)
///
/// ```js
/// const input = ImageInput.from_bytes(bytes);
/// const outcome = convert_image_to_webp_auto(input, true);
///
/// const webp = outcome.data; // read once
/// console.log(outcome.mode, outcome.bytes_saved, outcome.co2_saved_grams);
///
/// input.free();
/// outcome.free();
/// ```
///
/// See the crate-level documentation for a complete example in JavaScript and in Rust.
#[wasm_bindgen]
pub fn convert_image_to_webp_auto(
	input: &ImageInput,
	allow_lossy: bool,
) -> Result<WebpConversionOutcome, JsError> {
	let bytes: &[u8] = input.as_bytes();
	let fmt: ImageFormat = input.detected_format();

	let err = |e: String| JsError::new(&format!("webp encode failed: {e}"));

	if fmt == ImageFormat::Gif {
		let (data, width, height, frame_count): (Vec<u8>, u32, u32, u32) =
			encode_gif_to_animated_webp(bytes)
				.map_err(|e: String| JsError::new(&format!("gif decode failed: {e}")))?;

		return Ok(WebpConversionOutcome {
			original_bytes: bytes.len() as u32,
			webp_bytes: data.len() as u32,
			data,
			width,
			height,
			lossy: true,
			animated: true,
			frame_count,
			quality: 0,
		});
	}

	let img: DynamicImage = decode_to_dynamic_image(bytes, fmt)
		.map_err(|e: String| JsError::new(&format!("decode failed: {e}")))?;

	let (width, height): (u32, u32) = (img.width(), img.height());

	let lossy_q: u8 = match fmt {
		ImageFormat::Jpeg => read_jpeg_luma_quant_sum(bytes)
			.map(infer_jpeg_quality_from_quant_sum)
			.map(|q: u8| q.clamp(MIN_LOSSY_QUALITY, MAX_LOSSY_QUALITY))
			.unwrap_or(LOSSY_FALLBACK_QUALITY),

		_ => LOSSY_FALLBACK_QUALITY,
	};

	let source_is_lossy: bool = match fmt {
		ImageFormat::Jpeg => true,
		ImageFormat::WebP => detect_webp_is_lossy(bytes).unwrap_or(false),
		_ => false,
	};

	let (data, lossy): (Vec<u8>, bool) = if !allow_lossy {
		(encode_webp_lossless(&img).map_err(err)?, false)
	} else if source_is_lossy {
		(encode_webp_lossy(&img, lossy_q).map_err(err)?, true)
	} else {
		let lossless: Vec<u8> = encode_webp_lossless(&img).map_err(err)?;

		if (lossless.len() as f64) <= bytes.len() as f64 * LOSSLESS_GOOD_ENOUGH {
			(lossless, false)
		} else {
			let lossy_bytes: Vec<u8> = encode_webp_lossy(&img, lossy_q).map_err(err)?;

			if lossy_bytes.len() < lossless.len() {
				(lossy_bytes, true)
			} else {
				(lossless, false)
			}
		}
	};

	Ok(WebpConversionOutcome {
		original_bytes: bytes.len() as u32,
		webp_bytes: data.len() as u32,
		data,
		width,
		height,
		lossy,
		animated: false,
		frame_count: 1,
		quality: if lossy { lossy_q } else { 0 },
	})
}