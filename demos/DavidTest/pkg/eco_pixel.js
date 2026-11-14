/* @ts-self-types="./eco_pixel.d.ts" */

/**
 * ImageInput is the most simpler, and yet important struct we have.
 * It simplifies the method we use on reading images so we don't need to use bytes directly.
 */
export class ImageInput {
    static __wrap(ptr) {
        const obj = Object.create(ImageInput.prototype);
        obj.__wbg_ptr = ptr;
        ImageInputFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ImageInputFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_imageinput_free(ptr, 0);
    }
    /**
     * Returns the amount of bytes inside the image.
     * @returns {number}
     */
    get byte_length() {
        const ret = wasm.imageinput_byte_length(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Return the bytes of the image.
     * This operation is costly as it clones the bytes of the image, be careful where you use it.
     * @returns {Uint8Array}
     */
    get bytes() {
        const ret = wasm.imageinput_bytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Returns the format of the image.
     * @returns {string}
     */
    get format() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.imageinput_format(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Converts the bytes of a file into an image format we can use.
     * Can fail, and return a common JSError.
     * @param {Uint8Array} bytes
     * @returns {ImageInput}
     */
    static from_bytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.imageinput_from_bytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ImageInput.__wrap(ret[0]);
    }
    /**
     * Takes an url and tries to wrap it.
     * Can fail.
     * @param {string} data_url
     * @returns {ImageInput}
     */
    static from_data_url(data_url) {
        const ptr0 = passStringToWasm0(data_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.imageinput_from_data_url(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ImageInput.__wrap(ret[0]);
    }
}
if (Symbol.dispose) ImageInput.prototype[Symbol.dispose] = ImageInput.prototype.free;

export class WebpConversionOutcome {
    static __wrap(ptr) {
        const obj = Object.create(WebpConversionOutcome.prototype);
        obj.__wbg_ptr = ptr;
        WebpConversionOutcomeFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WebpConversionOutcomeFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_webpconversionoutcome_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get animated() {
        const ret = wasm.webpconversionoutcome_animated(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get bytes_saved() {
        const ret = wasm.webpconversionoutcome_bytes_saved(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get co2_saved_grams() {
        const ret = wasm.webpconversionoutcome_co2_saved_grams(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Uint8Array}
     */
    get data() {
        const ret = wasm.webpconversionoutcome_data(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * @returns {number}
     */
    get frame_count() {
        const ret = wasm.webpconversionoutcome_frame_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get height() {
        const ret = wasm.webpconversionoutcome_height(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {boolean}
     */
    get is_smaller() {
        const ret = wasm.webpconversionoutcome_is_smaller(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {string}
     */
    get mode() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.webpconversionoutcome_mode(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get original_bytes() {
        const ret = wasm.webpconversionoutcome_original_bytes(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get quality() {
        const ret = wasm.webpconversionoutcome_quality(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get webp_bytes() {
        const ret = wasm.webpconversionoutcome_webp_bytes(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get width() {
        const ret = wasm.webpconversionoutcome_width(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) WebpConversionOutcome.prototype[Symbol.dispose] = WebpConversionOutcome.prototype.free;

/**
 * A Simple struct containing an aproximation of what a possible conversion will
 * entail. With it we can determine how we should treat a conversion, and if its
 * worth it.
 * It doesn't hold the original image data.
 */
export class WebpConversionPreview {
    static __wrap(ptr) {
        const obj = Object.create(WebpConversionPreview.prototype);
        obj.__wbg_ptr = ptr;
        WebpConversionPreviewFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WebpConversionPreviewFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_webpconversionpreview_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get animated() {
        const ret = wasm.__wbg_get_webpconversionpreview_animated(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {string}
     */
    get confidence() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_webpconversionpreview_confidence(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get estimated_ratio() {
        const ret = wasm.__wbg_get_webpconversionpreview_estimated_ratio(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get estimated_webp_bytes() {
        const ret = wasm.__wbg_get_webpconversionpreview_estimated_webp_bytes(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {string}
     */
    get format() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_webpconversionpreview_format(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get height() {
        const ret = wasm.__wbg_get_webpconversionpreview_height(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {boolean | undefined}
     */
    get is_lossy() {
        const ret = wasm.__wbg_get_webpconversionpreview_is_lossy(this.__wbg_ptr);
        return ret === 0xFFFFFF ? undefined : ret !== 0;
    }
    /**
     * @returns {number | undefined}
     */
    get jpeg_quality() {
        const ret = wasm.__wbg_get_webpconversionpreview_jpeg_quality(this.__wbg_ptr);
        return ret === 0xFFFFFF ? undefined : ret;
    }
    /**
     * @returns {boolean}
     */
    get likely_smaller() {
        const ret = wasm.__wbg_get_webpconversionpreview_likely_smaller(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {string}
     */
    get predicted_mode() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_webpconversionpreview_predicted_mode(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get width() {
        const ret = wasm.__wbg_get_webpconversionpreview_width(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {boolean} arg0
     */
    set animated(arg0) {
        wasm.__wbg_set_webpconversionpreview_animated(this.__wbg_ptr, arg0);
    }
    /**
     * @param {string} arg0
     */
    set confidence(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_webpconversionpreview_confidence(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} arg0
     */
    set estimated_ratio(arg0) {
        wasm.__wbg_set_webpconversionpreview_estimated_ratio(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set estimated_webp_bytes(arg0) {
        wasm.__wbg_set_webpconversionpreview_estimated_webp_bytes(this.__wbg_ptr, arg0);
    }
    /**
     * @param {string} arg0
     */
    set format(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_webpconversionpreview_format(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} arg0
     */
    set height(arg0) {
        wasm.__wbg_set_webpconversionpreview_height(this.__wbg_ptr, arg0);
    }
    /**
     * @param {boolean | null} [arg0]
     */
    set is_lossy(arg0) {
        wasm.__wbg_set_webpconversionpreview_is_lossy(this.__wbg_ptr, isLikeNone(arg0) ? 0xFFFFFF : arg0 ? 1 : 0);
    }
    /**
     * @param {number | null} [arg0]
     */
    set jpeg_quality(arg0) {
        wasm.__wbg_set_webpconversionpreview_jpeg_quality(this.__wbg_ptr, isLikeNone(arg0) ? 0xFFFFFF : arg0);
    }
    /**
     * @param {boolean} arg0
     */
    set likely_smaller(arg0) {
        wasm.__wbg_set_webpconversionpreview_likely_smaller(this.__wbg_ptr, arg0);
    }
    /**
     * @param {string} arg0
     */
    set predicted_mode(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_webpconversionpreview_predicted_mode(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} arg0
     */
    set width(arg0) {
        wasm.__wbg_set_webpconversionpreview_width(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) WebpConversionPreview.prototype[Symbol.dispose] = WebpConversionPreview.prototype.free;

/**
 * @param {ImageInput} input
 * @param {boolean} allow_lossy
 * @returns {WebpConversionOutcome}
 */
export function convert_image_to_webp_auto(input, allow_lossy) {
    _assertClass(input, ImageInput);
    const ret = wasm.convert_image_to_webp_auto(input.__wbg_ptr, allow_lossy);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return WebpConversionOutcome.__wrap(ret[0]);
}

export function init() {
    wasm.init();
}

/**
 * Takes an ImageInput and guesses the possible outcomes.
 * Like what it is its quality, if its lossy, is it animated, and eve how much bytes we can
 * end up with.
 * @param {ImageInput} input
 * @param {boolean} allow_lossy
 * @returns {WebpConversionPreview}
 */
export function preview_webp_conversion(input, allow_lossy) {
    _assertClass(input, ImageInput);
    const ret = wasm.preview_webp_conversion(input.__wbg_ptr, allow_lossy);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return WebpConversionPreview.__wrap(ret[0]);
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_30c8987f7c2ed4e2: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_error_757e9472f8410341: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_new_227d7c05414eb861: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./eco_pixel_bg.js": import0,
    };
}

const ImageInputFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_imageinput_free(ptr, 1));
const WebpConversionOutcomeFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_webpconversionoutcome_free(ptr, 1));
const WebpConversionPreviewFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_webpconversionpreview_free(ptr, 1));

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('eco_pixel_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
