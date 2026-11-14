# Erros e solução de problemas

## Mensagens lançadas pela biblioteca

As mensagens são sempre em inglês, exatamente como abaixo.

| A mensagem começa com | Significado |
|---|---|
| `unknown format:` | Os bytes não são um formato de imagem reconhecido. Confira se você passou o conteúdo do arquivo. |
| `data url has no comma separator` | O texto não é uma data URL. Ela deve ser parecida com `data:image/png;base64,...`. |
| `invalid base64:` | A parte depois da vírgula não é um base64 padrão válido (o preenchimento com `=` é obrigatório). |
| `header read failed:` | Não foi possível ler o cabeçalho da imagem durante a prévia. O arquivo pode estar corrompido ou ser uma variante não compatível do formato. |
| `decode failed:` | Não foi possível decodificar a imagem. O arquivo pode estar corrompido ou usar um recurso que o decodificador não suporta. |
| `gif decode failed:` | Não foi possível ler ou converter o GIF, por exemplo porque ele não tem quadros ou porque um quadro não tem paleta de cores. |
| `webp encode failed:` | O codificador de WebP informou um erro. |

## Problemas comuns

**O módulo não carrega.**
Sirva a página por HTTP em vez de abri-la com `file://` e garanta que os arquivos `.wasm` sejam
enviados como `application/wasm`. Veja [Compilando o pacote](building.md).

**Um erro sobre algo indefinido logo no início.**
Garanta que você use `await init()` uma vez antes de chamar qualquer outra coisa.

**`RuntimeError: unreachable`.**
É assim que um pânico (panic) do Rust aparece em WebAssembly. A biblioteca instala um gancho de
pânico, então a mensagem real do pânico é exibida no console do navegador: abra as ferramentas
de desenvolvedor e leia o primeiro erro. Depois de um pânico, o módulo WebAssembly pode ficar em
um estado inconsistente; por isso, recarregue a página antes de tentar de novo e evite chamar
`free()` em objetos que estavam em uso quando isso aconteceu.

**`outcome.data` está vazio.**
Ele já foi lido. `data` só pode ser lido uma vez; guarde o primeiro resultado em uma variável.
Veja [Memória e free()](memory.md).

**O WebP ficou maior que o original.**
Isso acontece, principalmente com WebP sem perdas feito a partir de um JPEG. Verifique
`outcome.is_smaller` e envie o arquivo original quando for `false`. Passar `true` em
`allowLossy` costuma evitar o problema em fotos.

**A página trava durante a conversão.**
A conversão é síncrona. Execute-a em um Web Worker para imagens grandes; veja o
[Início rápido](quick-start.md).

**A prévia ficou bem longe do tamanho real.**
Isso é esperado às vezes. A prévia usa proporções fixas por formato e nunca codifica nada. Use
o resultado para os números reais.
