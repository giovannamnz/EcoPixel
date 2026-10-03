use image::{DynamicImage, ImageFormat, RgbImage, RgbaImage};
use std::io::Cursor;
use wasm_bindgen::prelude::*;
use zenwebp::{EncodeRequest, LosslessConfig, LossyConfig, PixelLayout};

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
/// It simplifies the method we use on reading images so we don't need to use bytes directly.
#[wasm_bindgen]
pub struct ImageInput {
	bytes: Vec<u8>,
	format: ImageFormat,
}

#[wasm_bindgen]
impl ImageInput {
	#[wasm_bindgen(js_name = from_bytes)]
	pub fn from_bytes(bytes: Vec<u8>) -> Result<ImageInput, JsError> {
		let format: ImageFormat = image::guess_format(&bytes)
			.map_err(|e: image::ImageError| e)
			.map_err(|e: image::ImageError| JsError::new(&format!("unknown format: {e}")))?;

		Ok(ImageInput { bytes, format })
	}

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

	#[wasm_bindgen(getter)]
	pub fn format(&self) -> String {
		format!("{:?}", self.format)
	}

	#[wasm_bindgen(getter)]
	pub fn byte_length(&self) -> u32 {
		self.bytes.len() as u32
	}

	#[wasm_bindgen(getter)]
	pub fn bytes(&self) -> Vec<u8> {
		self.bytes.clone()
	}
}

impl ImageInput {
	fn as_bytes(&self) -> &[u8] {
		&self.bytes
	}

	fn detected_format(&self) -> ImageFormat {
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


/// This calculates de delay for a given gif. It helps us determine how many frames per
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


// ---------------------------------------------------------------------------
// WebP encoding — animated GIF
// ---------------------------------------------------------------------------

/// Encodes a GIF directly into an animated WebP, streaming frames from the
/// decoder into zenwebp's animation encoder.
///
/// Returns `(webp_bytes, width, height, frame_count)`.
fn encode_gif_to_animated_webp(input: &[u8]) -> Result<(Vec<u8>, u32, u32, u32), String> {
	let mut opts: gif::DecodeOptions = gif::DecodeOptions::new();
	opts.set_color_output(gif::ColorOutput::RGBA);

	let mut decoder: gif::Decoder<Cursor<&[u8]>> = opts
		.read_info(Cursor::new(input))
		.map_err(|e: gif::DecodingError| e.to_string())?;

	let first: &gif::Frame = decoder
		.read_next_frame()
		.map_err(|e: gif::DecodingError| e.to_string())?
		.ok_or_else(|| "gif has no frames".to_string())?;

	let width: u32 = first.width as u32;
	let height: u32 = first.height as u32;

	let config: zenwebp::mux::AnimationConfig =
		zenwebp::mux::AnimationConfig::default();

	let mut encoder: zenwebp::mux::AnimationEncoder =
		zenwebp::mux::AnimationEncoder::new(width, height, config)
			.map_err(|e| e.to_string())?;

	let encoder_config: zenwebp::EncoderConfig =
		zenwebp::EncoderConfig::new_lossy();

	let mut timestamp_ms: u32 = 0;
	let mut frame_count: u32 = 0;

	encoder
		.add_frame(
			&first.buffer,
			PixelLayout::Rgba8,
			timestamp_ms,
			&encoder_config,
		)
		.map_err(|e| e.to_string())?;

	let first_delay_ms: u32 = gif_delay_to_ms(first.delay);
	timestamp_ms += first_delay_ms;
	frame_count += 1;

	while let Some(frame) = decoder
		.read_next_frame()
		.map_err(|e: gif::DecodingError| e.to_string())?
	{
		encoder
			.add_frame(
				&frame.buffer,
				PixelLayout::Rgba8,
				timestamp_ms,
				&encoder_config,
			)
			.map_err(|e| format!("{e:?}"))?;

		timestamp_ms += gif_delay_to_ms(frame.delay);
		frame_count += 1;
	}

	let last_frame_duration_ms: u32 = if frame_count == 1 {
		first_delay_ms
	} else {
		gif_delay_to_ms(
			decoder
				.read_next_frame()
				.ok()
				.flatten()
				.map(|f: &gif::Frame| f.delay)
				.unwrap_or(10),
		)
	};

	let data: Vec<u8> = encoder
		.finalize(last_frame_duration_ms)
		.map_err(|e| format!("{e:?}"))?;

	Ok((data, width, height, frame_count))
}


// ---------------------------------------------------------------------------
// Decoding (still path)
// ---------------------------------------------------------------------------

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


// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

#[wasm_bindgen(getter_with_clone)]
pub struct WebpConversionPreview {
	pub format: String,
	pub width: u32,
	pub height: u32,
	pub is_lossy: Option<bool>,
	pub jpeg_quality: Option<u8>,
	pub animated: bool,
	pub estimated_webp_bytes: u32,
	pub estimated_ratio: f64,
	pub likely_smaller: bool,
	pub confidence: String,
	pub predicted_mode: String,
}

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


// ---------------------------------------------------------------------------
// Conversion outcome
// ---------------------------------------------------------------------------

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
	#[wasm_bindgen(getter)]
	pub fn data(&mut self) -> Vec<u8> {
		std::mem::take(&mut self.data)
	}

	#[wasm_bindgen(getter)]
	pub fn original_bytes(&self) -> u32 {
		self.original_bytes
	}

	#[wasm_bindgen(getter)]
	pub fn webp_bytes(&self) -> u32 {
		self.webp_bytes
	}

	#[wasm_bindgen(getter)]
	pub fn width(&self) -> u32 {
		self.width
	}

	#[wasm_bindgen(getter)]
	pub fn height(&self) -> u32 {
		self.height
	}

	#[wasm_bindgen(getter)]
	pub fn mode(&self) -> String {
		if self.lossy {
			"lossy".into()
		} else {
			"lossless".into()
		}
	}

	#[wasm_bindgen(getter)]
	pub fn animated(&self) -> bool {
		self.animated
	}

	#[wasm_bindgen(getter)]
	pub fn frame_count(&self) -> u32 {
		self.frame_count
	}

	#[wasm_bindgen(getter)]
	pub fn quality(&self) -> u8 {
		self.quality
	}

	#[wasm_bindgen(getter)]
	pub fn is_smaller(&self) -> bool {
		self.webp_bytes < self.original_bytes
	}

	#[wasm_bindgen(getter)]
	pub fn bytes_saved(&self) -> u32 {
		self.original_bytes.saturating_sub(self.webp_bytes)
	}

	#[wasm_bindgen(getter)]
	pub fn co2_saved_grams(&self) -> f64 {
		estimate_transfer_co2_grams(self.bytes_saved())
	}
}


// ---------------------------------------------------------------------------
// Conversion entry point
// ---------------------------------------------------------------------------

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