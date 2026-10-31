# Limitações

O que é preciso saber antes de confiar no EcoPixel.

## O valor de CO₂ é uma estimativa

Ele é construído a partir de médias e conta apenas a transferência de rede evitada. Ignora a
energia gasta no dispositivo do visitante. Veja [A estimativa de CO₂](co2.md).

## Um WebP nem sempre é menor

Um WebP sem perdas feito a partir de um JPEG costuma ser bem maior que o JPEG, e algumas imagens
simplesmente não diminuem. Sempre verifique `is_smaller`. Quanto o WebP com perdas economiza em
relação ao JPEG depende da imagem e de quão bem o JPEG foi comprimido desde o início; não
presuma uma porcentagem fixa. Meça com as suas próprias imagens.

## A prévia é um palpite

`preview_webp_conversion` usa regras práticas fixas por formato. Serve apenas como uma indicação
aproximada.

## As configurações de perdas são fixas

Você escolhe se a compressão com perdas é permitida, mas não a qualidade. A biblioteca a define:
estimada a partir do arquivo nos JPEGs (mantida entre 60 e 90), 80 para as demais conversões com
perdas e 75 para GIFs.

## O suporte a GIF é básico

- Os quadros são desenhados em uma tela, mas a configuração de "método de descarte" (*disposal
  method*) do GIF, que diz o que fazer com a área de um quadro antes do quadro seguinte, não é
  aplicada com precisão na ordem que a especificação do GIF descreve. Alguns GIFs que dependem
  dela podem não ficar idênticos.
- O último quadro da animação é exibido pelo mesmo tempo que o primeiro, em vez de usar o seu
  próprio atraso.

Teste com os seus próprios GIFs antes de depender do resultado.

## Erros em alvos Rust nativos

Os erros são valores `JsError`, que só podem ser criados dentro do WebAssembly. Em um alvo
nativo, uma chamada que falha entra em pânico (panic) em vez de devolver um `Err`. Use a crate
em Rust principalmente para o caminho de sucesso, ou valide a entrada antes de chamá-la. Veja
[Usando em Rust](rust.md).

## Uma thread, sem redimensionamento

A conversão roda em uma única thread e bloqueia até terminar. A biblioteca apenas converte
formatos; ela não redimensiona nem recorta imagens, então reduza você mesmo as imagens muito
grandes se não precisar da resolução completa.
