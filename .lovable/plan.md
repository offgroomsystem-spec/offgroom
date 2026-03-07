

## Melhorias no Formulário "Lançar Financeiro"

### Problema 1: Campo "Valor" com zero inicial que não apaga
O campo `Valor` usa `type="number"` com `value={item.valor}` (inicializado como `0`). Ao digitar, o zero permanece, resultando em "0200".

**Solucao:** Converter o campo para `type="text"` com formatacao manual, ou tratar o `value` para exibir string vazia quando for 0, e usar `onFocus` para limpar.

Abordagem mais simples: exibir `item.valor || ""` em vez de `item.valor`, para que quando o valor for 0 o campo fique vazio. O placeholder "R$ 0,00" já indica o formato.

### Problema 2: Novo campo "Total" (Qtd × Valor) por item
Atualmente o campo `Qtd` só aparece para itens do tipo "Venda" (linha 358-370). O "Valor Total" final soma apenas `item.valor` sem considerar quantidade.

**Mudancas no `ItemLancamentoForm`:**

1. Adicionar campo readonly "Total" ao lado do campo "Valor", calculado como `item.valor * (item.quantidade || 1)`
2. O botão "+ Item" ficará ao lado do novo campo "Total" (mover de ao lado do Valor para ao lado do Total)
3. Ajustar o grid de colunas para acomodar o novo campo

**Layout atualizado do grid (quando `isVenda`):**
- Descrição 2 (col-span-3)
- Produto (col-span-3)
- Qtd (col-span-1)
- Valor (col-span-2)
- Total (col-span-2) + botão "+ Item"
- Botão remover

**Layout quando NÃO é Venda:**
- Descrição 2 (col-span-4)
- Observação (col-span-4)
- Valor (col-span-2)
- Total (col-span-2) + botão "+ Item"

Neste caso, Qtd não aparece (assume 1), então Total = Valor.

### Problema 3: "Valor Total" final deve usar o campo Total (Qtd × Valor)
A linha 2153 calcula: `itensLancamento.reduce((acc, item) => acc + item.valor, 0)` — precisa mudar para `acc + item.valor * (item.quantidade || 1)`.

Mesma correção na linha 2162 (subtotal com dedução).

### Arquivos a editar
- `src/pages/ControleFinanceiro.tsx`:
  - **ItemLancamentoForm** (linhas 257-401): Adicionar campo "Total" readonly, mover botão "+ Item", corrigir grid
  - **Campo Valor** (linha 380): Exibir `item.valor || ""` em vez de `item.valor`
  - **Valor Total** (linhas 2148-2165): Usar `item.valor * (item.quantidade || 1)` no reduce
  - **Mesmo ajuste** no dialog de Editar Lançamento (linhas ~3126+) se usar o mesmo componente (já usa `ItemLancamentoForm`, então a correção no componente cobre ambos)

