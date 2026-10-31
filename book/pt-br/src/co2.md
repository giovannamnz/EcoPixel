# A estimativa de CO₂

`co2_saved_grams` é a massa estimada de CO₂ equivalente que **deixou** de ser emitida porque o
WebP é menor que o original.

## A fórmula

```text
co2_saved_grams = bytes_saved / 1.000.000.000   (gigabytes)
                  x 0,81                        (kWh por gigabyte transferido)
                  x 442                         (gramas de CO2e por kWh)
```

Isso dá cerca de **0,36 g de CO₂e para cada megabyte** que não precisou ser enviado.

As duas constantes seguem o estilo do modelo Sustainable Web Design. Confira-as na versão atual
desse modelo antes de citar os números em qualquer lugar.

## Um exemplo

Convertendo uma foto que economiza 150 KB:

```text
150.000 / 1.000.000.000 x 0,81 x 442  =  cerca de 0,054 g de CO2e
```

É muito pouco para uma única imagem. A ideia é que isso se acumula: sob as mesmas premissas, um
milhão dessas imagens evitaria cerca de 54 kg de CO₂e.

## O que o número inclui e o que não inclui

- Ele conta apenas a **transferência de rede** que foi evitada.
- Ele **não** inclui a energia que o dispositivo do visitante gasta para fazer a conversão.
- Ele vale `0` sempre que o WebP não é menor que o original, então a biblioteca nunca declara
  uma economia que não obteve.
- É uma estimativa baseada em médias, não uma medição de nenhuma rede ou rede elétrica real.

Ao mostrar o número para os usuários, indique que se trata de uma estimativa.
