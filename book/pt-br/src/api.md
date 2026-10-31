# API JavaScript

Tudo é exportado de `pkg/eco_pixel.js`. As definições de tipos do TypeScript são geradas em
`pkg/eco_pixel.d.ts`.

```js
import init, {
  ImageInput,
  preview_webp_conversion,
  convert_image_to_webp_auto,
} from "./pkg/eco_pixel.js";
```

## init()

A exportação padrão. Carrega o módulo WebAssembly. Chame `await init()` uma vez, antes de
qualquer outra coisa.

## ImageInput

| Membro | Descrição |
|---|---|
| `ImageInput.from_bytes(bytes: Uint8Array)` | Envolve os bytes de um arquivo de imagem e detecta o formato. Lança um erro se o formato não for reconhecido. |
| `ImageInput.from_data_url(url: string)` | Envolve uma imagem recebida como data URL. Tudo depois da primeira vírgula é decodificado como base64 padrão. Lança um erro se não houver vírgula, se o base64 for inválido ou se o formato não for reconhecido. |
| `input.format` | Nome do formato detectado, como `"Png"`, `"Jpeg"`, `"Gif"` ou `"WebP"`. |
| `input.byte_length` | Tamanho da entrada em bytes. |
| `input.bytes` | Uma cópia dos bytes de entrada. Lento para arquivos grandes; evite em laços. |
| `input.free()` | Opcional. Libera a memória imediatamente. |

## preview_webp_conversion(input, allowLossy)

Devolve uma previsão da conversão sem codificar nada. Lança um erro se o cabeçalho da imagem não
puder ser lido.

| Propriedade | Descrição |
|---|---|
| `format` | Formato de origem detectado. |
| `width`, `height` | Tamanho da imagem em pixels, lido do cabeçalho. |
| `is_lossy` | `true` para JPEG e WebP com perdas, `false` para GIF e WebP sem perdas, `undefined` quando não dá para saber (PNG, BMP, TIFF e outros). |
| `jpeg_quality` | Qualidade estimada (1-100) de um JPEG. `undefined` para outros formatos. |
| `animated` | `true` para entrada GIF. |
| `estimated_webp_bytes` | Palpite aproximado do tamanho do WebP em bytes. |
| `estimated_ratio` | Tamanho estimado do WebP dividido pelo tamanho original. Acima de 1 significa que provavelmente ficará maior. |
| `likely_smaller` | `true` quando `estimated_ratio` é menor que 1. |
| `confidence` | `"low"` ou `"medium"`. |
| `predicted_mode` | `"lossy"` ou `"lossless"`. Também é um palpite. |

## convert_image_to_webp_auto(input, allowLossy)

Converte a imagem e devolve um resultado. Veja [Com ou sem perdas?](lossy-lossless.md) para
saber como `allowLossy` é usado. Lança um erro se a imagem não puder ser decodificada ou
codificada.

| Propriedade | Descrição |
|---|---|
| `data` | O arquivo WebP como `Uint8Array`. **Leia uma vez**; leituras seguintes vêm vazias. |
| `original_bytes` | Tamanho do arquivo original em bytes. |
| `webp_bytes` | Tamanho do arquivo WebP em bytes. |
| `width`, `height` | Tamanho da imagem em pixels. |
| `mode` | `"lossy"` ou `"lossless"`. |
| `quality` | Qualidade com perdas (0-100) usada em uma imagem estática; `0` para saída sem perdas e para GIFs. |
| `animated` | `true` quando a saída é um WebP animado. |
| `frame_count` | Número de quadros; `1` para imagens estáticas. |
| `is_smaller` | `true` quando o WebP é estritamente menor que o original. |
| `bytes_saved` | `original_bytes - webp_bytes`, nunca abaixo de `0`. |
| `co2_saved_grams` | Gramas de CO₂e economizados, estimados; veja [A estimativa de CO₂](co2.md). |
| `free()` | Opcional. Libera a memória imediatamente. |

## Erros

As falhas são lançadas como objetos `Error` comuns do JavaScript. Use `try`/`catch` e leia
`e.message`. Veja [Erros e solução de problemas](troubleshooting.md) para conhecer as mensagens
que você pode encontrar.
