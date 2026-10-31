# Memória e free()

`ImageInput`, a prévia e o resultado vivem na memória do WebAssembly, não no heap do
JavaScript. O JavaScript guarda apenas um pequeno objeto intermediário que aponta para eles.

## Preciso chamar free()?

Não. Quando o navegador oferece suporte a `FinalizationRegistry`, o código JavaScript de ligação
gerado libera a memória automaticamente assim que o objeto intermediário é coletado pelo coletor
de lixo. Chamar `free()` é opcional.

Ainda assim, ele é útil em dois casos:

- **Imagens grandes.** `free()` libera a memória imediatamente, em vez de esperar o coletor de
  lixo resolver agir.
- **Laços de repetição.** O coletor de lixo não consegue rodar no meio de código síncrono. Se
  você converte muitas imagens em um único laço, sem nenhum `await` dentro dele, a memória só é
  recuperada quando o laço termina, e um lote grande pode esgotar a memória. Chame `free()` em
  cada objeto, ou use `await` em algo dentro do laço para que a limpeza possa acontecer.

```js
input.free();
outcome.free();
```

Um objeto não pode ser usado depois de `free()`.

## Leia os dados apenas uma vez

`outcome.data` entrega os bytes do WebP em vez de copiá-los. A primeira leitura devolve o
arquivo inteiro e qualquer leitura seguinte devolve um array vazio. Leia uma única vez para uma
variável:

```js
const webp = outcome.data; // guarde isto
```

As outras propriedades, como `webp_bytes` e `co2_saved_grams`, continuam funcionando depois que
`data` foi lido.

Da mesma forma, `input.bytes` devolve uma **cópia** dos bytes originais a cada leitura, o que é
lento para arquivos grandes. Raramente você precisa dele, já que você já tem os bytes que
passou.
