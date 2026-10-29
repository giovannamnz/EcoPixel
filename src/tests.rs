use super::*;
use wasm_bindgen_test::*;

#[wasm_bindgen_test]
#[test]
fn gif_delay_zero_becomes_100ms() {
	assert_eq!(gif_delay_to_ms(0), 100);
}

#[wasm_bindgen_test]
#[test]
fn gif_delay_ten_cs_becomes_100ms() {
	assert_eq!(gif_delay_to_ms(10), 100);
}

#[wasm_bindgen_test]
#[test]
fn gif_delay_nonzero_is_ten_times() {
	assert_eq!(gif_delay_to_ms(5), 50);
}

#[wasm_bindgen_test]
#[test]
fn jpeg_quality_estimator_is_monotone_in_sum() {
	let q_low: u8 = infer_jpeg_quality_from_quant_sum(500);
	let q_high: u8 = infer_jpeg_quality_from_quant_sum(5000);
	assert!(q_low > q_high);
}


// -- decode / detect --------------------------------------------------------

#[wasm_bindgen_test]
#[test]
fn rejects_unknown_format() {
	let bytes: Vec<u8> = vec![0xDE, 0xAD, 0xBE, 0xEF];
	let result: Result<ImageInput, JsError> = ImageInput::from_bytes(bytes);
	assert!(result.is_err());
}

#[wasm_bindgen_test]
#[test]
fn rejects_data_url_without_comma() {
	let result: Result<ImageInput, JsError> =
		ImageInput::from_data_url("data:image/png;base64");
	assert!(result.is_err());
}

#[wasm_bindgen_test]
#[test]
fn rejects_malformed_base64() {
	let result: Result<ImageInput, JsError> =
		ImageInput::from_data_url("data:image/png;base64,!!!!");
	assert!(result.is_err());
}

#[wasm_bindgen_test]
#[test]
fn detects_lossy_webp_magic() {
	let mut bytes: Vec<u8> = Vec::new();
	bytes.extend_from_slice(b"RIFF");
	bytes.extend_from_slice(&[0, 0, 0, 0]);
	bytes.extend_from_slice(b"WEBP");
	bytes.extend_from_slice(b"VP8 ");
	bytes.extend_from_slice(&[0, 0, 0, 0]);
	assert_eq!(detect_webp_is_lossy(&bytes), Some(true));
}


// -- end-to-end -------------------------------------------------------------

#[wasm_bindgen_test]
fn converts_png_to_lossless_webp() {
	let png: Vec<u8> = make_tiny_png();
	let input: ImageInput = ImageInput::from_bytes(png).expect("valid png");

	let mut outcome: WebpConversionOutcome =
		convert_image_to_webp_auto(&input, false).expect("convert");

	assert_eq!(outcome.animated(), false);
	assert_eq!(outcome.frame_count(), 1);
	assert_eq!(outcome.mode(), "lossless");

	let bytes: Vec<u8> = outcome.data();
	assert_eq!(&bytes[0..4], b"RIFF");
	assert_eq!(&bytes[8..12], b"WEBP");
}

#[wasm_bindgen_test]
#[test]
fn converts_png_to_webp_when_lossy_allowed() {
	let png: Vec<u8> = make_tiny_png();
	let input: ImageInput = ImageInput::from_bytes(png).expect("valid png");

	let mut outcome: WebpConversionOutcome =
		convert_image_to_webp_auto(&input, true).expect("convert");

	let mode: String = outcome.mode();
	assert!(mode == "lossy" || mode == "lossless");

	let bytes: Vec<u8> = outcome.data();
	assert_eq!(&bytes[0..4], b"RIFF");
	assert_eq!(&bytes[8..12], b"WEBP");
}

#[wasm_bindgen_test]
#[test]
fn converts_gif_to_animated_webp() {
	let gif: Vec<u8> = make_two_frame_gif();
	let input: ImageInput = ImageInput::from_bytes(gif).expect("valid gif");

	let mut outcome: WebpConversionOutcome =
		convert_image_to_webp_auto(&input, true).expect("convert");

	assert!(outcome.animated());
	assert_eq!(outcome.frame_count(), 2);

	let bytes: Vec<u8> = outcome.data();
	assert_eq!(&bytes[0..4], b"RIFF");
	assert_eq!(&bytes[12..16], b"VP8X");
}

#[wasm_bindgen_test]
#[test]
fn bytes_saved_saturates_at_zero() {
	let png: Vec<u8> = make_tiny_png();
	let input: ImageInput = ImageInput::from_bytes(png).expect("valid png");
	let outcome: WebpConversionOutcome =
		convert_image_to_webp_auto(&input, true).expect("convert");

	let saved: u32 = outcome.bytes_saved();
	let webp: u32 = outcome.webp_bytes();
	let original: u32 = outcome.original_bytes();

	assert_eq!(saved.saturating_add(webp), original);
}

#[wasm_bindgen_test]
#[test]
fn co2_saved_is_non_negative() {
	let png: Vec<u8> = make_tiny_png();
	let input: ImageInput = ImageInput::from_bytes(png).expect("valid png");
	let outcome: WebpConversionOutcome =
		convert_image_to_webp_auto(&input, true).expect("convert");

	assert!(outcome.co2_saved_grams() >= 0.0);
}


// -- fixtures ---------------------------------------------------------------

fn make_tiny_png() -> Vec<u8> {
	use image::{ImageBuffer, Rgba};
	let img: ImageBuffer<Rgba<u8>, Vec<u8>> =
		ImageBuffer::from_pixel(2, 2, Rgba([255, 0, 0, 255]));
	let mut out: Vec<u8> = Vec::new();
	img.write_to(
		&mut std::io::Cursor::new(&mut out),
		image::ImageFormat::Png,
	)
	.expect("encode png");
	out
}

fn make_two_frame_gif() -> Vec<u8> {
	let mut out: Vec<u8> = Vec::new();
	{
		let mut enc: gif::Encoder<&mut Vec<u8>> =
			gif::Encoder::new(&mut out, 1, 1, &[]).expect("encoder");
		enc.set_repeat(gif::Repeat::Infinite).expect("repeat");

		let mut f1: gif::Frame<'static> = gif::Frame::from_rgba(1, 1, &mut [255, 0, 0, 255]);
		f1.delay = 10;
		enc.write_frame(&f1).expect("frame 1");

		let mut f2: gif::Frame<'static> = gif::Frame::from_rgba(1, 1, &mut [0, 0, 255, 255]);
		f2.delay = 10;
		enc.write_frame(&f2).expect("frame 2");
	}
	out
}