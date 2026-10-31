# Memory and free()

`ImageInput`, the preview and the outcome live in WebAssembly memory, not in the JavaScript
heap. JavaScript only holds a small wrapper object that points to them.

## Do I have to call free()?

No. When the browser supports `FinalizationRegistry`, the generated JavaScript glue releases
the memory automatically once the wrapper object is garbage collected. Calling `free()` is
optional.

It is still useful in two cases:

- **Large images.** `free()` releases the memory immediately instead of whenever the garbage
  collector gets around to it.
- **Loops.** The garbage collector cannot run in the middle of synchronous code. If you
  convert many images in one loop with no `await` inside it, the memory is not reclaimed until
  the loop ends, and a big batch can run out of memory. Call `free()` on each object, or
  `await` something inside the loop so cleanup can happen.

```js
input.free();
outcome.free();
```

An object cannot be used after `free()`.

## Reading the data only once

`outcome.data` hands the WebP bytes over instead of copying them. The first read returns the
whole file and any later read returns an empty array. Read it once into a variable:

```js
const webp = outcome.data; // keep this
```

The other properties, such as `webp_bytes` and `co2_saved_grams`, keep working after `data`
has been read.

Similarly, `input.bytes` returns a **copy** of the original bytes every time it is read, which
is slow for large files. You rarely need it, since you already have the bytes you passed in.
