# Conceitos principais

Há três coisas para conhecer: a entrada, a prévia e o resultado.

## ImageInput

`ImageInput` envolve os bytes brutos de um arquivo de imagem e lembra qual é o formato.

```js
const input = ImageInput.from_bytes(new Uint8Array(await file.arrayBuffer()));
console.log(input.format);      // por exemplo "Png", "Jpeg", "Gif", "WebP"
console.log(input.byte_length); // tamanho em bytes
```

Se você tem a imagem como data URL (`data:image/png;base64,...`), use
`ImageInput.from_data_url(url)`. Quando você parte de um `File`, prefira `from_bytes`: ele
pula a etapa de base64 e o acréscimo de cerca de 33% no tamanho.

Criar um `ImageInput` só detecta o formato. Os pixels são decodificados depois, durante a
conversão. Por isso, uma imagem corrompida pode passar por esta etapa e falhar na conversão.

O mesmo `ImageInput` pode ser usado em várias chamadas, por exemplo uma prévia seguida de uma
conversão, ou conversões com a compressão com perdas ligada e desligada.

## A prévia

`preview_webp_conversion(input, allowLossy)` devolve uma previsão rápida sem codificar nada. Ela
lê apenas o cabeçalho da imagem, então é rápida mesmo para arquivos grandes.

Ela informa as dimensões, se a origem já tem perdas, a qualidade estimada de um JPEG, se a
imagem é animada e um palpite aproximado do tamanho do WebP, com uma `confidence` (confiança)
de `"low"` ou `"medium"`.

O palpite de tamanho vem de proporções fixas por formato, não de uma codificação real. Use-o
para mostrar uma estimativa ou para decidir se vale a pena rodar a conversão, e confie no
resultado para os números reais.

## O resultado

`convert_image_to_webp_auto(input, allowLossy)` faz a conversão e devolve um resultado
(`outcome`). Ele contém:

- o arquivo WebP (`data`),
- os tamanhos: `original_bytes`, `webp_bytes` e `bytes_saved`,
- `width` e `height` da imagem,
- como ela foi codificada: `mode` (`"lossy"` ou `"lossless"`), `quality`, `animated` e
  `frame_count`,
- `is_smaller`, que diz se o WebP ficou menor que o original,
- `co2_saved_grams`, o CO₂ economizado estimado.

Sempre verifique `is_smaller` antes de enviar o WebP. Quando for `false`, o arquivo original é a
melhor escolha, e `bytes_saved` e `co2_saved_grams` valem `0`.
