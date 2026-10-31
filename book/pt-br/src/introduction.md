# EcoPixel

O EcoPixel converte imagens para [WebP](https://developers.google.com/speed/webp) **no
dispositivo do visitante** e informa quanto de CO₂ foi evitado por enviar um arquivo menor.

Ele é escrito em Rust e compilado para WebAssembly, então um site pode chamá-lo a partir de
JavaScript. Também pode ser usado como uma crate Rust comum.

## Por que converter no navegador?

Normalmente o navegador envia o PNG ou JPEG original e o servidor o converte, isso quando
alguém converte. Se o navegador converter a imagem antes, um arquivo menor trafega pela rede e
o servidor tem menos trabalho. A quantidade de dados que não precisou trafegar é a base do
valor de CO₂.

O valor é uma **estimativa**, não uma medição. Veja [A estimativa de CO₂](co2.md) para saber
exatamente o que ela leva em conta.

## O que ele faz

- Lê arquivos PNG, JPEG, GIF, BMP, TIFF e WebP, recebidos como bytes ou como data URL.
- Converte para WebP: sem perdas, com perdas ou escolhido automaticamente.
- Transforma GIFs animados em WebP animado.
- Informa o tamanho original, o novo tamanho, os bytes economizados e o CO₂ economizado
  estimado.
- Roda inteiramente no dispositivo do visitante. A biblioteca não envia nada.

## O fluxo em quatro passos

1. **Envolva o arquivo** com `ImageInput`. Isso detecta o formato.
2. **Opcionalmente, faça uma prévia** da conversão. Ela dá uma estimativa rápida de tamanho sem
   codificar nada.
3. **Converta** a imagem. Você recebe os bytes do WebP e as estatísticas.
4. **Use o resultado.** Envie o WebP ou, se ele não ficou menor, o arquivo original.

Continue em [Compilando o pacote](building.md) ou vá direto ao
[Início rápido](quick-start.md) se você já tem o pacote compilado.
