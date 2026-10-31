# Compilando o pacote

O EcoPixel é compilado para WebAssembly com o
[`wasm-pack`](https://rustwasm.github.io/wasm-pack/), que também gera o wrapper JavaScript e as
definições de tipos do TypeScript.

## Pré-requisitos

Você precisa de uma toolchain do Rust, do alvo WebAssembly e do `wasm-pack`:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

## Compilar

Execute isto na pasta da crate:

```bash
wasm-pack build --target web --release
```

O resultado é uma pasta `pkg/` contendo:

| Arquivo | O que é |
|---|---|
| `eco_pixel_bg.wasm` | A biblioteca compilada |
| `eco_pixel.js` | Código JavaScript de ligação; é o que você importa |
| `eco_pixel.d.ts` | Tipos do TypeScript, incluindo os comentários de documentação |
| `package.json` | Metadados do pacote, para que a pasta possa ser publicada ou instalada |

Recompile a cada alteração no código Rust e force a atualização da página (Ctrl+F5) para que o
navegador não use uma cópia em cache.

## Escolhendo um alvo

| `--target` | Use para | Observações |
|---|---|---|
| `web` | Navegadores puros, Vite, Web Workers | Chame `await init()` uma vez antes de usar qualquer coisa |
| `bundler` | Webpack e bundlers com suporte a WebAssembly | Sem chamada a `init()`; precisa de um bundler capaz de importar arquivos `.wasm` |
| `nodejs` | Scripts Node.js | Não serve para converter imagens no navegador do visitante |

Este livro usa `web`.

## Servindo os arquivos

Os navegadores se recusam a carregar WebAssembly de uma página aberta com `file://`. Sirva a
pasta por HTTP com qualquer servidor de arquivos estáticos. Por exemplo:

```bash
python -m http.server 8080
```

Depois abra `http://localhost:8080/`. O servidor precisa enviar os arquivos `.wasm` com o tipo
de conteúdo `application/wasm`. A maioria dos servidores estáticos faz isso, e é a primeira
coisa a verificar se o módulo não carregar.
