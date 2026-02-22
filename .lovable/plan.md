

## Corrigir visibilidade do botao "+Pet" no Controle Financeiro

### Problema

No formulario de lancamento do Controle Financeiro (`src/pages/ControleFinanceiro.tsx`), o botao "+Pet" aparece sempre que um pet e selecionado, mesmo quando o dono daquele pet nao tem outros pets cadastrados. O comportamento correto e o botao so aparecer quando existem pets adicionais para adicionar.

### Solucao

Mesma correcao ja aplicada no Fluxo de Caixa: criar um `useMemo` chamado `temPetsAdicionais` e usar na condicao de renderizacao do botao.

### Alteracoes

**Arquivo: `src/pages/ControleFinanceiro.tsx`**

1. **Novo `useMemo` `temPetsAdicionais`** (apos `petsFormulario`, linha 748): Calcula se o dono do pet selecionado tem outros pets disponiveis para adicionar.

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

2. **Condicao do botao "+Pet"** (linha 1866): Alterar de:
```
{formData.tipo === "Receita" && formData.nomeCliente && formData.nomePet && (
```
Para:
```
{formData.tipo === "Receita" && formData.nomeCliente && formData.nomePet && temPetsAdicionais && (
```

Resultado: ao selecionar "Pompom", o botao "+Pet" aparece (pois a dona tem "Amora"). Ao selecionar "Pingo", o botao nao aparece (unico pet da dona).
