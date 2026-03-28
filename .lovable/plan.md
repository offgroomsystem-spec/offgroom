

## Plano: Unificar Custos Diretos dentro de Despesas Operacionais

### Problema

O DRE atual separa "Produtos para Banho" e "Material de Limpeza" numa seção própria ("Deduções e Custos Diretos"), enquanto as demais subcategorias de "Despesa Operacional" ficam em outra seção separada. O usuário quer que TODAS as subcategorias de "Despesa Operacional" fiquem juntas, eliminando a seção de custos diretos.

### Estrutura corrigida

```text
(+) Receita Operacional Bruta
    Serviços / Venda / Outras Receitas Operacionais

(=) Lucro Bruto   (= Receita Op Bruta, sem deduções de custos diretos)

(-) Despesas Operacionais   ← TODAS juntas
    Produtos para Banho
    Material de Limpeza
    Combustível
    Contador
    Freelancer
    Telefonia e Internet
    Energia Elétrica
    Água e Esgoto
    Publicidade e Marketing
    Outras Despesas Operacionais

(-) Despesas Fixas
    Aluguel / Salários / Impostos Fixos / Financiamentos / Sistemas e Softwares / Outras

(=) Lucro Operacional

(+/-) Resultado Não Operacional
  (+) Receita Não Operacional
  (-) Despesa Não Operacional

(=) LUCRO LÍQUIDO DO EXERCÍCIO
```

### Alterações em `src/components/relatorios/financeiros/DRE.tsx`

1. **Remover `CUSTOS_OPERACIONAIS`** (linha 56) — constante não mais necessária

2. **Simplificar `useMemo`** (linhas 215-221):
   - Remover cálculo de `custosOperacionais` e `despesasOperacionaisTotal`
   - `lucroBruto = receitaOp.total` (sem dedução de custos diretos)
   - `lucroOperacional = lucroBruto - despesaOp.total - despesaFixa.total`
   - `despesasTotal = despesaOp.total + despesaFixa.total + despesaNaoOp.total`

3. **Renderização JSX** (linhas 600-622):
   - Remover bloco "Deduções e Custos Diretos" (linhas 606-610)
   - Lucro Bruto = Receita Op (sem custos diretos)
   - Despesas Operacionais: renderizar TODAS as subcategorias (sem filtro `CUSTOS_OPERACIONAIS`)

4. **PDF** (linhas 303-325):
   - Remover bloco "Deduções e Custos Diretos"
   - Despesas Operacionais: iterar sobre todas sem skip

### Técnico

- Apenas reorganização de labels e remoção de lógica de separação
- Cálculos permanecem corretos (soma total de `despesaOp` usada diretamente)
- O DRE continua 100% dinâmico via `categoriasDescricao2`

