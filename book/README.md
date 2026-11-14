# EcoPixel documentation

Two [mdBook](https://rust-lang.github.io/mdBook/) books, one per language:

| Folder | Language |
|---|---|
| `en/` | English |
| `pt-br/` | Português (Brasil) |

A language drop-down in the menu bar switches to the same page in the other language. This works
because every page has the same file name in both books.

## Build

```bash
cargo install mdbook   # once
./build.sh             # macOS / Linux
.\build.ps1            # Windows PowerShell
```

The finished site is written to `site/`: `site/en`, `site/pt-br`, and a `site/index.html` that
opens the language the visitor used last time, or the browser's language.

## Preview

The drop-down only appears when both books are served together, so preview the built site:

```bash
python -m http.server 8080 -d site
```

Then open `http://localhost:8080/`.

To work on one book with live reload, run `mdbook serve en` or `mdbook serve pt-br` inside this
folder. That shows a single book, without the drop-down.

## Adding another language

1. Copy `en/` to a new folder (for example `es/`) and translate the files in `src/`. Keep the
   file names the same.
2. In its `book.toml`, set `language` and `build-dir = "../site/es"`.
3. Add the language to the `LANGS` list in `lang-switcher.js` (the same file is in every book
   folder), to `build.sh` and `build.ps1`, and to `index.html`.

---

## Português

Dois livros do mdBook, um por idioma (`en/` e `pt-br/`). O menu suspenso de idioma na barra
superior leva para a mesma página no outro idioma.

Para compilar: `cargo install mdbook` (uma vez) e depois `./build.sh` (macOS/Linux) ou
`.\build.ps1` (Windows PowerShell). O site pronto fica em `site/`. Para ver o menu de idioma,
sirva a pasta `site` com um servidor local: `python -m http.server 8080 -d site`.
