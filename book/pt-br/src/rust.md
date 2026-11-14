# Usando em Rust

A crate é compilada tanto como biblioteca WebAssembly quanto como biblioteca Rust normal
(`rlib`), então você pode chamar as mesmas funções a partir de código Rust, por exemplo em uma
ferramenta de linha de comando.

## Exemplo

Este exemplo usa apenas a biblioteca padrão para ler e gravar arquivos:

```rust,ignore
use eco_pixel::{convert_image_to_webp_auto, ImageInput};

fn main() {
    // Lê do disco qualquer arquivo de imagem compatível.
    let bytes: Vec<u8> = std::fs::read("photo.png").expect("não foi possível ler photo.png");

    let input = ImageInput::from_bytes(bytes).expect("imagem não reconhecida");
    let mut outcome = convert_image_to_webp_auto(&input, true).expect("falha na conversão");

    println!("{} -> {} bytes", outcome.original_bytes(), outcome.webp_bytes());
    println!("~{:.6} g de CO2e economizados (estimativa)", outcome.co2_saved_grams());

    // Guarda o WebP só se ele for realmente menor que o original.
    if outcome.is_smaller() {
        std::fs::write("photo.webp", outcome.data()).expect("não foi possível gravar photo.webp");
    } else {
        println!("O WebP não ficou menor, mantenha o arquivo original.");
    }
}
```

## Diferenças em relação ao JavaScript

- Os getters são métodos comuns: `outcome.is_smaller()` em Rust, `outcome.is_smaller` em
  JavaScript.
- `outcome.data()` recebe `&mut self`, porque os bytes são movidos para fora. Ele pode ser
  chamado uma vez; as chamadas seguintes devolvem um `Vec` vazio.
- Nada precisa ser liberado manualmente. O Rust descarta os valores quando saem de escopo.

## Os erros funcionam melhor no navegador

As funções que podem falhar devolvem `Result<_, JsError>`. Um `JsError` só pode ser criado
dentro do WebAssembly. Quando a crate roda como um programa nativo comum, uma chamada que falha,
como passar bytes que não são uma imagem, **entra em pânico** (panic) em vez de devolver um
`Err`. O caminho de sucesso funciona normalmente em alvos nativos. Veja
[Limitações](limitations.md).
