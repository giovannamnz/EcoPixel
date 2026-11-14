/* tslint:disable */
/* eslint-disable */

/**
 * ImageInput is the most simpler, and yet important struct we have.
 * It simplifies the method we use on reading images so we don't need to use bytes directly.
 */
export class ImageInput {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Converts the bytes of a file into an image format we can use.
     * Can fail, and return a common JSError.
     */
    static from_bytes(bytes: Uint8Array): ImageInput;
    /**
     * Takes an url and tries to wrap it.
     * Can fail.
     */
    static from_data_url(data_url: string): ImageInput;
    /**
     * Returns the amount of bytes inside the image.
     */
    readonly byte_length: number;
    /**
     * Return the bytes of the image.
     * This operation is costly as it clones the bytes of the image, be careful where you use it.
     */
    readonly bytes: Uint8Array;
    /**
     * Returns the format of the image.
     */
    readonly format: string;
}

export class WebpConversionOutcome {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly animated: boolean;
    readonly bytes_saved: number;
    readonly co2_saved_grams: number;
    readonly data: Uint8Array;
    readonly frame_count: number;
    readonly height: number;
    readonly is_smaller: boolean;
    readonly mode: string;
    readonly original_bytes: number;
    readonly quality: number;
    readonly webp_bytes: number;
    readonly width: number;
}

/**
 * A Simple struct containing an aproximation of what a possible conversion will
 * entail. With it we can determine how we should treat a conversion, and if its
 * worth it.
 * It doesn't hold the original image data.
 */
export class WebpConversionPreview {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    animated: boolean;
    confidence: string;
    estimated_ratio: number;
    estimated_webp_bytes: number;
    format: string;
    height: number;
    get is_lossy(): boolean | undefined;
    set is_lossy(value: boolean | null | undefined);
    get jpeg_quality(): number | undefined;
    set jpeg_quality(value: number | null | undefined);
    likely_smaller: boolean;
    predicted_mode: string;
    width: number;
}

export function convert_image_to_webp_auto(input: ImageInput, allow_lossy: boolean): WebpConversionOutcome;

export function init(): void;

/**
 * Takes an ImageInput and guesses the possible outcomes.
 * Like what it is its quality, if its lossy, is it animated, and eve how much bytes we can
 * end up with.
 */
export function preview_webp_conversion(input: ImageInput, allow_lossy: boolean): WebpConversionPreview;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_get_webpconversionpreview_animated: (a: number) => number;
    readonly __wbg_get_webpconversionpreview_confidence: (a: number) => [number, number];
    readonly __wbg_get_webpconversionpreview_estimated_ratio: (a: number) => number;
    readonly __wbg_get_webpconversionpreview_estimated_webp_bytes: (a: number) => number;
    readonly __wbg_get_webpconversionpreview_format: (a: number) => [number, number];
    readonly __wbg_get_webpconversionpreview_height: (a: number) => number;
    readonly __wbg_get_webpconversionpreview_is_lossy: (a: number) => number;
    readonly __wbg_get_webpconversionpreview_jpeg_quality: (a: number) => number;
    readonly __wbg_get_webpconversionpreview_likely_smaller: (a: number) => number;
    readonly __wbg_get_webpconversionpreview_predicted_mode: (a: number) => [number, number];
    readonly __wbg_get_webpconversionpreview_width: (a: number) => number;
    readonly __wbg_imageinput_free: (a: number, b: number) => void;
    readonly __wbg_set_webpconversionpreview_animated: (a: number, b: number) => void;
    readonly __wbg_set_webpconversionpreview_confidence: (a: number, b: number, c: number) => void;
    readonly __wbg_set_webpconversionpreview_estimated_ratio: (a: number, b: number) => void;
    readonly __wbg_set_webpconversionpreview_estimated_webp_bytes: (a: number, b: number) => void;
    readonly __wbg_set_webpconversionpreview_format: (a: number, b: number, c: number) => void;
    readonly __wbg_set_webpconversionpreview_height: (a: number, b: number) => void;
    readonly __wbg_set_webpconversionpreview_is_lossy: (a: number, b: number) => void;
    readonly __wbg_set_webpconversionpreview_jpeg_quality: (a: number, b: number) => void;
    readonly __wbg_set_webpconversionpreview_likely_smaller: (a: number, b: number) => void;
    readonly __wbg_set_webpconversionpreview_predicted_mode: (a: number, b: number, c: number) => void;
    readonly __wbg_set_webpconversionpreview_width: (a: number, b: number) => void;
    readonly __wbg_webpconversionoutcome_free: (a: number, b: number) => void;
    readonly __wbg_webpconversionpreview_free: (a: number, b: number) => void;
    readonly convert_image_to_webp_auto: (a: number, b: number) => [number, number, number];
    readonly imageinput_byte_length: (a: number) => number;
    readonly imageinput_bytes: (a: number) => [number, number];
    readonly imageinput_format: (a: number) => [number, number];
    readonly imageinput_from_bytes: (a: number, b: number) => [number, number, number];
    readonly imageinput_from_data_url: (a: number, b: number) => [number, number, number];
    readonly init: () => void;
    readonly preview_webp_conversion: (a: number, b: number) => [number, number, number];
    readonly webpconversionoutcome_animated: (a: number) => number;
    readonly webpconversionoutcome_bytes_saved: (a: number) => number;
    readonly webpconversionoutcome_co2_saved_grams: (a: number) => number;
    readonly webpconversionoutcome_data: (a: number) => [number, number];
    readonly webpconversionoutcome_frame_count: (a: number) => number;
    readonly webpconversionoutcome_height: (a: number) => number;
    readonly webpconversionoutcome_is_smaller: (a: number) => number;
    readonly webpconversionoutcome_mode: (a: number) => [number, number];
    readonly webpconversionoutcome_original_bytes: (a: number) => number;
    readonly webpconversionoutcome_quality: (a: number) => number;
    readonly webpconversionoutcome_webp_bytes: (a: number) => number;
    readonly webpconversionoutcome_width: (a: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
