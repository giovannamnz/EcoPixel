# EcoPixel

[![Rust](https://img.shields.io/badge/Rust-WebAssembly-orange.svg)](https://www.rust-lang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-REST%20API-brightgreen.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue.svg)](https://www.postgresql.org/)


O EcoPixel é uma aplicação web para otimização de imagens e análise do impacto da transferência e do processamento desses arquivos. O projeto permite comparar imagens originais com versões convertidas, avaliar a qualidade visual e estimar o balanço energético associado à otimização.

## Funcionalidades

- **Otimização de imagens:** processamento de arquivos JPEG e PNG, com geração de imagens WebP ou AVIF.
- **Conversão sem perdas:** utiliza o núcleo Rust compilado para WebAssembly para realizar a conversão automática para WebP.
- **Compressão adaptativa:** utiliza busca binária para encontrar um nível de qualidade que atenda ao SSIM mínimo definido.
- **Avaliação de qualidade:** apresenta métricas SSIM e PSNR para comparar a imagem original com a versão otimizada.
- **Estimativa energética:** calcula a economia estimada na transferência de dados, o custo de processamento e o balanço líquido para uma quantidade configurável de acessos.
- **Auditoria de páginas web:** utiliza Playwright e Chromium em modo headless para acessar uma URL, interceptar imagens JPEG e PNG e coletar métricas de carregamento, incluindo o Largest Contentful Paint (LCP).
- **Processamento em lote:** permite selecionar ou arrastar múltiplas imagens para processamento.

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript (ES Modules)
- Rust
- WebAssembly (WASM)
- Node.js
- Playwright
- Chromium

## Estrutura do projeto

```text
ecopixel/
├── app.js
├── index.html
├── package.json
├── package-lock.json
├── server.js
├── style.css
└── pkg/
    ├── eco_pixel.js
    ├── eco_pixel.d.ts
    ├── eco_pixel_bg.wasm
    ├── eco_pixel_bg.wasm.d.ts
    └── package.json
```

A pasta `pkg/` contém os arquivos gerados para integração do módulo Rust/WebAssembly com a aplicação JavaScript.

## Requisitos

- Node.js e npm
- Chromium instalado pelo Playwright para utilizar a auditoria de páginas

## Instalação

Clone o repositório e acesse a pasta do projeto:

```bash
git clone <URL_DO_REPOSITORIO>
cd ecopixel
```

Instale as dependências:

```bash
npm install
```

Instale o navegador Chromium utilizado pelo Playwright:

```bash
npx playwright install chromium
```

## Execução

Inicie o servidor local:

```bash
node server.js
```

A aplicação ficará disponível em:

```text
http://localhost:3000
```

O servidor utiliza a variável de ambiente `PORT` quando definida. Caso contrário, utiliza a porta `3000`.

## Como utilizar

### Otimização de imagens locais

1. Abra a aplicação no navegador.
2. Arraste arquivos JPEG ou PNG para a área de seleção ou clique nela para escolher os arquivos.
3. Defina o SSIM mínimo desejado, o formato de saída e o perfil energético do dispositivo.
4. Selecione a escala de acessos considerada na estimativa.
5. Mantenha a opção de compressão com perdas habilitada para utilizar a busca binária adaptativa. Desabilite-a para utilizar a conversão WebP sem perdas baseada no módulo Rust/WebAssembly.
6. Consulte as métricas e faça o download dos arquivos gerados.

### Auditoria de uma página web

1. Informe uma URL iniciada por `http://` ou `https://`.
2. Escolha o perfil de visualização mobile ou desktop.
3. Clique em **Auditar Página**.
4. Consulte os dados de carregamento e as imagens JPEG/PNG interceptadas, que serão encaminhadas ao fluxo de otimização.

## Métricas e estimativas

O EcoPixel apresenta informações como:

- dimensões da imagem;
- tamanho original e tamanho após a conversão;
- redução em bytes e percentual;
- SSIM e PSNR;
- tempo de codificação e decodificação;
- balanço energético líquido estimado;
- estimativa de CO₂ equivalente;
- quantidade estimada de acessos necessária para atingir o ponto de equilíbrio (*break-even*).

As estimativas energéticas dependem dos parâmetros e fatores definidos na implementação, como consumo de referência do dispositivo, custo energético por gigabyte transferido e intensidade de carbono. Portanto, os valores devem ser interpretados como estimativas do modelo adotado, não como medições diretas do consumo real de cada dispositivo ou servidor.

<img width="1067" height="1239" alt="image" src="https://github.com/user-attachments/assets/b59a8362-7be9-4bc0-ae44-0407b8147e30" />

## Observações

- A seleção de imagens locais aceita arquivos JPEG e PNG.
- A auditoria automatizada utiliza Chromium em modo headless e depende de acesso à URL informada.
- A codificação AVIF depende do suporte do navegador à API de codificação utilizada pela aplicação. Caso o navegador não ofereça esse suporte, a operação poderá apresentar erro.
- O servidor local atende a aplicação e disponibiliza a rota `POST /api/audit-url`, utilizada pelo crawler.

## Licença

Nenhuma licença foi especificada neste repositório. Consulte os responsáveis pelo projeto antes de reutilizar ou distribuir o código.
