# GIF e animação

GIFs animados são convertidos em arquivos **WebP animados**, que os principais navegadores
atuais conseguem exibir.

```js
const input = ImageInput.from_bytes(gifBytes);
const outcome = convert_image_to_webp_auto(input, true);

console.log(outcome.animated);    // true
console.log(outcome.frame_count); // número de quadros
```

## Como funciona

- O WebP é sempre com perdas, com qualidade fixa de 75. A opção `allowLossy` não tem efeito
  sobre GIFs.
- Os quadros são desenhados em uma única tela do tamanho do GIF, então quadros que só
  atualizam parte da imagem, e pixels transparentes, são tratados.
- O GIF guarda o atraso de cada quadro em centésimos de segundo. Um atraso `0` é tratado como
  100 ms, porque levá-lo ao pé da letra faria a animação rodar o mais rápido possível.
- O resultado informa `quality` como `0` para GIFs, porque a qualidade é um valor interno fixo,
  e não algo estimado a partir do arquivo.
- A prévia informa `animated` como `true` para todo GIF, inclusive um GIF com um único quadro.

## Confira seus próprios GIFs

O suporte a GIF é básico. Sempre compare o resultado com o original em alguns GIFs seus antes
de depender dele. Veja em [Limitações](limitations.md) o que se sabe que ainda está rudimentar.
