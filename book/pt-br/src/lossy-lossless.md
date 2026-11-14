# Com ou sem perdas?

O WebP pode comprimir uma imagem de duas formas:

- **Sem perdas** (*lossless*) mantém cada pixel exatamente como era. Os arquivos ficam maiores.
- **Com perdas** (*lossy*) descarta alguns detalhes que o olho mal percebe. Os arquivos ficam
  bem menores, o que combina com fotografias.

O argumento `allowLossy` de `convert_image_to_webp_auto` é uma **permissão** para usar
compressão com perdas, não uma ordem. Com `false`, o resultado é sempre sem perdas. Com `true`,
a biblioteca decide com base na origem:

| Origem | `allowLossy = false` | `allowLossy = true` |
|---|---|---|
| JPEG | sem perdas | com perdas, com qualidade estimada a partir do próprio JPEG (mantida entre 60 e 90) |
| WebP com perdas | sem perdas | com perdas, qualidade 80 |
| PNG, BMP, TIFF, WebP sem perdas | sem perdas | primeiro sem perdas; se o resultado tiver no máximo 70% do tamanho original, ele é mantido; caso contrário, uma versão com perdas (qualidade 80) também é testada e vence a menor das duas |
| GIF | WebP animado com perdas (qualidade 75) | igual; a opção não tem efeito |

## O que devo passar?

- **Fotos e JPEGs:** passe `true`. Um WebP sem perdas feito a partir de um JPEG costuma ser bem
  maior que o JPEG, então o modo sem perdas anula o objetivo.
- **Capturas de tela, logotipos e gráficos (PNG):** `true` continua sendo uma boa opção. A
  biblioteca tenta primeiro o modo sem perdas e só passa para o modo com perdas quando o
  primeiro não reduz o arquivo o bastante.
- **Qualquer coisa que precise ficar idêntica pixel a pixel:** passe `false`.

Converter um JPEG para WebP com perdas comprime pela segunda vez uma imagem que já tinha perdas,
o que pode acrescentar pequenos artefatos. É por isso que a qualidade é estimada a partir do JPEG
e mantida dentro de uma faixa razoável.

As propriedades `mode` e `quality` do resultado mostram o que foi realmente usado.
