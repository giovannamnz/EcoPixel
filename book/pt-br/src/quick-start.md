# Início rápido (JavaScript)

Esta página é um exemplo completo: escolha uma imagem, converta para WebP e mostre quanto foi
economizado. Ela pressupõe que você já compilou o pacote (veja
[Compilando o pacote](building.md)) e que a pasta `pkg/` está ao lado do seu arquivo HTML.

```html
<input id="file" type="file" accept="image/*">
<p id="result"></p>

<script type="module">
  import init, { ImageInput, convert_image_to_webp_auto } from "./pkg/eco_pixel.js";

  await init(); // carrega o módulo WebAssembly uma única vez

  document.getElementById("file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // 1. Envolva os bytes do arquivo.
      const bytes = new Uint8Array(await file.arrayBuffer());
      const input = ImageInput.from_bytes(bytes);

      // 2. Converta. `true` significa que a compressão com perdas é permitida.
      const outcome = convert_image_to_webp_auto(input, true);

      // 3. Pegue os bytes do WebP. Leia `data` uma única vez.
      const webp = outcome.data;
      const blob = new Blob([webp], { type: "image/webp" });

      // 4. Envie o WebP só se ele for realmente menor.
      const toUpload = outcome.is_smaller ? blob : file;
      // await fetch("/upload", { method: "POST", body: toUpload });

      document.getElementById("result").textContent =
        `${outcome.original_bytes} -> ${outcome.webp_bytes} bytes ` +
        `(${outcome.mode}), cerca de ${outcome.co2_saved_grams.toFixed(4)} g de CO2e economizados`;
    } catch (e) {
      document.getElementById("result").textContent = `Falha na conversão: ${e.message ?? e}`;
    }
  });
</script>
```

## O que aconteceu

- `init()` baixa e inicia o módulo WebAssembly. Chame-o uma vez, antes de qualquer outra coisa.
- `ImageInput.from_bytes` verifica qual é o formato do arquivo de imagem.
- `convert_image_to_webp_auto(input, true)` faz a conversão. O segundo argumento diz se a
  compressão com perdas é permitida; veja [Com ou sem perdas?](lossy-lossless.md).
- `outcome.data` contém o arquivo WebP. Ele só pode ser lido uma vez; veja
  [Memória e free()](memory.md).
- `outcome.is_smaller` diz se a conversão realmente ajudou. Um WebP nem sempre é menor que o
  original, então envie o original quando o valor for `false`.

## Mostrando uma estimativa antes

Para mostrar um tamanho aproximado antes de converter, chame `preview_webp_conversion`. Ela lê
apenas o cabeçalho do arquivo e não codifica nada:

```js
import { preview_webp_conversion } from "./pkg/eco_pixel.js";

const preview = preview_webp_conversion(input, true);
console.log(preview.estimated_webp_bytes, preview.confidence);
```

Os números vêm de regras práticas fixas por formato, então trate-os como um palpite.

## Mantenha a página responsiva

A conversão é uma chamada síncrona comum, então uma imagem grande pode travar a página por um
instante. Para imagens grandes, carregue o módulo e execute a conversão dentro de um
[Web Worker](https://developer.mozilla.org/docs/Web/API/Web_Workers_API), enviando os bytes
para ele com `postMessage`.
