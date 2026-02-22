
## Corrigir listbox de Pets para clientes com nomes duplicados

### Problema

Quando existem dois clientes com o mesmo nome (ex: "Jessica"), ao selecionar o nome no formulario, o sistema usa `clientes.find()` que retorna apenas o **primeiro** cliente encontrado. Isso faz com que apenas os pets do primeiro cliente aparecam na listbox, ignorando os pets do segundo cliente com o mesmo nome.

### Solucao

Alterar `petsFormulario` (linha 979-987) para usar `clientes.filter()` em vez de `clientes.find()`, coletando os pets de **todos** os clientes com o mesmo nome.

### Alteracoes

**Arquivo: `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`**

1. **`petsFormulario` (linhas 979-987)**: Trocar a logica para filtrar todos os clientes com o mesmo nome e retornar os pets de todos eles:

```typescript
const petsFormulario = useMemo(() => {
  if (!formData.nomeCliente) {
    return pets.map((p) => p.nomePet);
  }
  const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
  if (clientesComMesmoNome.length === 0) return [];

  const idsClientes = clientesComMesmoNome.map((c) => c.id);
  return pets.filter((p) => idsClientes.includes(p.clienteId)).map((p) => p.nomePet);
}, [formData.nomeCliente, clientes, pets]);
```

Isso garante que ao selecionar "Jessica", os pets Pingo, Pompom e Amora aparecerao na listbox. O botao "+Pet" ja funciona corretamente pois usa `clientes.filter()` na logica interna (linha 1963).
