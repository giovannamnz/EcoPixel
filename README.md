# EcoPixel 
### Plataforma de Otimização e Auditoria de Imagens para Green Computing na Web

[![Licença](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-WebAssembly-orange.svg)](https://www.rust-lang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-REST%20API-brightgreen.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue.svg)](https://www.postgresql.org/)

---

## Sobre o Projeto

O crescimento contínuo do tráfego em aplicações web acarreta um aumento expressivo no consumo de recursos computacionais e de infraestrutura de rede. Imagens nos formatos tradicionais (como JPEG e PNG) continuam representando a maior fração da carga de bytes transferida pela internet.

O **EcoPixel** é uma solução para a mitigação dessa pegada de dados e consumo energético. A plataforma realiza a conversão e compressão inteligente de imagens para o formato **WebP**, garantindo a validação da fidelidade visual por meio de métricas objetivas de qualidade (**SSIM** e **PSNR**) e quantificando o impacto ecológico por meio da estimativa de energia economizada (kWh) e emissões de carbono equivalente ($gCO_2e$) evitadas.

### Privacidade e Arquitetura *Client-Side First*
Diferente das ferramentas tradicionais de compressão em nuvem, o processamento e a decodificação/compressão das imagens ocorrem **100% localmente no navegador do usuário**, utilizando um núcleo de processamento compilado em **Rust para WebAssembly (Wasm)**.
* As imagens do usuário **nunca** transitam pela rede nem são salvas no servidor.
* O backend recebe exclusivamente os **metadados e as métricas calculadas** (tamanhos, taxas de redução, índices de qualidade visual e consumo energético estimado) para fins de auditoria e histórico.

---

## Principais Funcionalidades

- **Processamento e Otimização em Lote:** Suporte a upload simultâneo de até 20 imagens (limites de 15 MB/imagem e 50 MB no lote) com conversão configurável para WebP.
- **Auditoria de Qualidade Perceptual Objetiva:**
  - **SSIM (Structural Similarity Index Measure):** Classificação automática em *Alta Fidelidade* ($SSIM > 0,94$), *Fidelidade Moderada* ($0,84 < SSIM \le 0,94$) e *Alta Degradação Perceptual* ($SSIM \le 0,84$).
  - **PSNR (Peak Signal-to-Noise Ratio):** Mensuração do ruído e perda de sinal gerada pela compressão.
- **Calculadora Green IT de Impacto Ambiental:**
    - Estimativa baseada na metodologia do *Sustainable Web Design Model*:
      - Consumo de Energia: `ΔE = ΔGB × 0,81 kWh/GB`
      - Emissões Evitadas: `CO₂e = ΔE × 442 gCO₂e/kWh`
- **Exportação Flexível:** Download individual dos arquivos gerados ou consolidado via arquivo ZIP.
- **Painel de Histórico e Auditoria:** Visualização persistida dos lotes processados, comparativos de redução de peso e indicadores de qualidade ao longo do tempo.

---

## Arquitetura do Sistema

```text
┌────────────────────────────────────────────────────────┐
│                   DISPOSITIVO DO USUÁRIO               │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │           Front-end (HTML5 / CSS3 / JS)        │   │
│   └───────────────────────┬────────────────────────┘   │
│                           │ Chamadas locais            │
│   ┌───────────────────────▼────────────────────────┐   │
│   │           WebAssembly (Rust Core)              │   │
│   │  - Conversão WebP  - SSIM  - PSNR             │   │
│   │  - Economia Bytes  - Estimativa kWh & gCO2e    │   │
│   └────────────────────────────────────────────────┘   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS (Apenas Metadados & Métricas)
                            ▼
┌────────────────────────────────────────────────────────┐
│                        SERVIDOR                        │
│                                                        │
│   ┌────────────────────────────────────────────────┐   │
│   │                Node.js REST API                │   │
│   └───────────────────────┬────────────────────────┘   │
│                           │ Persistência               │
│   ┌───────────────────────▼────────────────────────┐   │
│   │              Banco PostgreSQL                  │   │
│   │       (Lotes, Imagens e Avaliações)            │   │
│   └────────────────────────────────────────────────┘   │
│            * NÃO ARMAZENA IMAGENS DO USUÁRIO *         │
└────────────────────────────────────────────────────────┘
```

---

## Tecnologias Utilizadas

### Front-end & Core
- **HTML5 / CSS3 / JavaScript (ES6+)**
- **Rust** (compilado para **WebAssembly**) para processamento de baixo nível e cálculo matricial de fidelidade de imagem.
- **wasm-bindgen / Emscripten** para interoperabilidade JS/Wasm.

### Back-end & Banco de Dados
- **Node.js** com Express (Arquitetura REST)
- **PostgreSQL** para persistência transacional de métricas e histórico.

---

## Modelo de Dados

O banco de dados armazena os metadados e os resultados das auditorias estruturados em três entidades principais:

```
┌──────────────┐          ┌─────────────────┐          ┌─────────────────┐
│     Lote     │ 1      N │     Imagem      │ 1      1 │    Avaliacao    │
│──────────────┼──────────┼─────────────────┼──────────┼─────────────────┤
│ ID (PK)      │◄─────────┤ ID (PK)         │◄─────────┤ ID (PK)         │
│ criado_em    │          │ lote_id (FK)    │          │ imagem_id (FK)  │
│ qtd_imagens  │          │ nome_arquivo    │          │ ssim            │
│ tamanho_orig │          │ formato_original│          │ psnr            │
│ tamanho_webp │          │ tamanho_original│          │ classificacao   │
│ reducao_bytes│          │ tamanho_webp    │          │ energia_kwh     │
│ reducao_pct  │          │ reducao_bytes   │          │ co2e_gramas     │
│ energia_kwh  │          │ reducao_pct     │          └─────────────────┘
│ co2e_gramas  │          │ criado_em       │
└──────────────┘          └─────────────────┘
```

---

## Como Executar o Projeto

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18+ recomendada)
- [Rust & Cargo](https://rustup.rs/) (com target `wasm32-unknown-unknown`) e `wasm-pack`
- [PostgreSQL](https://www.postgresql.org/) (versão 14+)

### 1. Clonar o repositório
```bash
git clone https://github.com/usuario/ecopixel.git
cd ecopixel
```

### 2. Compilar o núcleo WebAssembly (Rust)
```bash
cd wasm-core
wasm-pack build --target web --release
cd ..
```

### 3. Configurar e rodar o Servidor / API
Crie um arquivo `.env` na pasta `server` com as credenciais do PostgreSQL:
```env
PORT=3000
DATABASE_URL=postgresql://usuario:senha@localhost:5432/ecopixel_db
```

Execute as migrações e inicie a API:
```bash
cd server
npm install
npm run migrate
npm run dev
```

### 4. Executar o Front-end
Abra a aplicação front-end utilizando um servidor de desenvolvimento local (por exemplo, Vite ou Live Server):
```bash
cd client
npm install
npm run dev
```
Acesse a aplicação em: `http://localhost:´[]`.

---

## Integrantes do Projeto

Trabalho de Conclusão de Curso / Projeto de Desenvolvimento de Solução Computacional:

- **Caio Bordin Teles**
- **Daniel Ribeiro Teles**
- **David Costa Gomes**
- **Gabriel Lima Silva**
- **Gabriela Dos Santos Leite**
- **Giovanna Menezes Silva**

**Orientador / Professor:** Adam Smith Gontijo Brito De Assis  
**Turma:** GPE02M80093

---

## Referências

- WHOLEGRAWN DIGITAL; MIGHTYBYTES. *Calculating Digital Emissions: The Sustainable Web Design Model*, 2024. Disponível em: [sustainablewebdesign.org](https://sustainablewebdesign.org/calculating-digital-emissions/) [cite: 1].
- HTTP ARCHIVE. *Page Weight Report: Image Bytes Distribution*, 2026. Disponível em: [httparchive.org](https://httparchive.org/reports/page-weight) [cite: 1].
- WANG, Zhou et al. *Image quality assessment: from error visibility to structural similarity*. IEEE Transactions on Image Processing, v. 13, n. 4, p. 600-612, 2004 [cite: 1].
- GONZALEZ, Rafael C.; WOODS, Richard E. *Processamento Digital de Imagens*. 3. ed. Pearson Prentice Hall, 2010 [cite: 1].

