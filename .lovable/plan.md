

## Corrigir visibilidade do botao "+Pet" baseado em pets adicionais disponiveis

### Problema

O botao "+Pet" aparece sempre que um pet e selecionado, mesmo quando o dono daquele pet nao tem outros pets cadastrados. Por exemplo, ao selecionar "Pingo" (unico pet de uma Jessica), o botao aparece mas o popover mostra "Nenhum pet adicional disponivel". O correto seria o botao so aparecer quando ha pets adicionais para adicionar.

### Solucao

Criar um `useMemo` que calcula se existem pets adicionais disponiveis para o dono do pet selecionado, e usar esse valor na condicao de renderizacao do botao "+Pet".

### Alteracoes

**Arquivo: `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`**

1. **Novo `useMemo` `temPetsAdicionais`**: Adicionar apos `petsFormulario`, com a seguinte logica:
   - Encontrar o cliente especifico que e dono do pet selecionado (usando `clientes.filter` por nome + `pets.find` por nomePet e clienteId)
   - Verificar se esse cliente tem outros pets alem do selecionado e dos ja adicionados em `petsSelecionados`
   - Retornar `true` ou `false`

```typescript
const temPetsAdicionais = useMemo(() => {
  if (!formData.nomeCliente || !formData.nomePet) return false;
  const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
  let clienteSelecionado: typeof clientes[0] | undefined;
  for (const cliente of clientesComMesmoNome) {
    const petEncontrado = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id);
    if (petEncontrado) { clienteSelecionado = cliente; break; }
  }
  if (!clienteSelecionado) return false;
  const petsDisponiveis = pets.filter(
    (p) => p.clienteId === clienteSelecionado!.id
      && p.nomePet !== formData.nomePet
      && !formData.petsSelecionados.some((ps) => ps.id === p.id)
  );
  return petsDisponiveis.length > 0;
}, [formData.nomeCliente, formData.nomePet, formData.petsSelecionados, clientes, pets]);
```

2. **Condicao do botao "+Pet"** (linha 1952): Alterar de:
   ```
   {formData.tipo === "Receita" && formData.nomeCliente && formData.nomePet && (
   ```
   Para:
   ```
   {formData.tipo === "Receita" && formData.nomeCliente && formData.nomePet && temPetsAdicionais && (
   ```

Isso garante que ao selecionar "Pompom", o botao "+Pet" aparece (pois a dona tem "Amora" tambem), mas ao selecionar "Pingo", o botao nao aparece (pois a dona do Pingo nao tem outros pets).

