

## Correcao: Botao "+Pet" nao aparecendo ao selecionar Amora

### Diagnostico

Revisei todo o codigo e os dados no banco de dados. As alteracoes anteriores foram aplicadas corretamente:
- O `useMemo` `temPetsAdicionais` esta presente (linhas 750-765)
- A condicao `temPetsAdicionais` esta nas duas instancias do botao "+Pet" (linhas 1883 e 2902)
- Os dados estao corretos: Amora e Pompom pertencem a mesma Jessica (`9daaeb35`), ambas com porte "pequeno"

A logica esta funcionando corretamente. O botao deveria aparecer ao selecionar Jessica + Amora.

**Possivel causa do problema**: O preview pode nao ter sido atualizado com as ultimas alteracoes. Porem, para garantir que nao haja nenhum problema residual, vou aplicar uma pequena melhoria de seguranca.

### Problema encontrado na segunda instancia do popover (mobile)

Na segunda instancia do popover "+Pet" (linha 2915, visao mobile/edicao), a logica do **conteudo do popover** ainda usa `clientes.find()` em vez de `clientes.filter()`. Isso significa que, mesmo que o botao apareca corretamente, o popover pode mostrar "Nenhum pet disponivel" se o `find()` pegar a Jessica errada.

### Alteracoes

**Arquivo: `src/pages/ControleFinanceiro.tsx`**

1. **Corrigir o conteudo do popover na segunda instancia (linhas 2914-2921)**: Trocar `clientes.find()` por `clientes.filter()` com loop, igualando a logica da primeira instancia (linhas 1895-1915).

De:
```typescript
const clienteSelecionado = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
const primeiroPet = pets.find(
  (p) => p.nomePet === formData.nomePet && p.clienteId === clienteSelecionado?.id,
);
```

Para:
```typescript
const clientesComMesmoNome = clientes.filter(
  (c) => c.nomeCliente === formData.nomeCliente,
);
let clienteSelecionado: Cliente | undefined;
let primeiroPet: Pet | undefined;
for (const cliente of clientesComMesmoNome) {
  const petEncontrado = pets.find(
    (p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id,
  );
  if (petEncontrado) {
    clienteSelecionado = cliente;
    primeiroPet = petEncontrado;
    break;
  }
}
```

2. **Remover filtro de porte na segunda instancia (linhas 2923-2928)**: A primeira instancia (desktop) nao filtra por porte, mas a segunda (mobile) filtra com `p.porte === primeiroPet.porte`. Igualar ao comportamento da primeira instancia removendo o filtro de porte para consistencia.

De:
```typescript
const petsDisponiveis = pets.filter(
  (p) =>
    p.clienteId === clienteSelecionado.id &&
    p.porte === primeiroPet.porte &&
    p.nomePet !== formData.nomePet &&
    !formData.petsSelecionados.some((ps) => ps.id === p.id),
);
```

Para:
```typescript
const petsDisponiveis = pets.filter(
  (p) =>
    p.clienteId === clienteSelecionado!.id &&
    p.nomePet !== formData.nomePet &&
    !formData.petsSelecionados.some((ps) => ps.id === p.id),
);
```

Essas alteracoes garantem que ambas as instancias (desktop e mobile) usem a mesma logica correta para encontrar o cliente dono do pet e listar os pets adicionais disponiveis.
