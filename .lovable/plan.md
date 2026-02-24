

## Adicionar "Aplicacao Financeira" e "Resgate de Aplicacao Financeira" ao sistema

### Resumo

Adicionar duas novas categorias financeiras:
1. **Despesa > Despesa Nao Operacional > Aplicacao Financeira**
2. **Receita > Receita Nao Operacional > Resgate de Aplicacao Financeira**

Essas categorias precisam ser adicionadas nos formularios de lancamento e tambem nos relatorios que exibem essas subcategorias.

### Alteracoes

#### 1. Formulario de lancamento - Controle Financeiro
**Arquivo: `src/pages/ControleFinanceiro.tsx`**

- Linha 142-147: Adicionar "Aplicacao Financeira" na lista de `categoriasDescricao2["Despesa Nao Operacional"]`
- Linha 128: Adicionar "Resgate de Aplicacao Financeira" na lista de `categoriasDescricao2["Receita Nao Operacional"]`

#### 2. Formulario de lancamento - Fluxo de Caixa
**Arquivo: `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`**

- Linha 163-168: Adicionar "Aplicacao Financeira" na lista de `categoriasDescricao2["Despesa Nao Operacional"]`
- Linha 149: Adicionar "Resgate de Aplicacao Financeira" na lista de `categoriasDescricao2["Receita Nao Operacional"]`

#### 3. Relatorio Despesas Nao Operacionais
**Arquivo: `src/components/relatorios/financeiros/DespesasNaoOperacionais.tsx`**

- Linha 242-244: Adicionar "Aplicacao Financeira" na lista de categorias do grafico de barras
- Linha 567-571: Adicionar `<SelectItem>` para "Aplicacao Financeira" no filtro de categoria
- Linha 1011-1013: Adicionar `<SelectItem>` para "Aplicacao Financeira" no select de edicao de descricao2

#### 4. Relatorio Receita Nao Operacional
**Arquivo: `src/components/relatorios/financeiros/ReceitaNaoOperacional.tsx`**

- Linha 307-323: Adicionar `useMemo` para calcular receita por "Resgate de Aplicacao Financeira"
- Linha 326-330: Adicionar no grafico de barras
- Linha 515-517: Adicionar `<SelectItem>` para "Resgate de Aplicacao Financeira" no filtro
- Adicionar card KPI para exibir o total de "Resgate de Aplicacao Financeira"

### Detalhes tecnicos

Nenhuma alteracao no banco de dados e necessaria. As categorias (descricao1 e descricao2) sao definidas apenas no frontend como listas estaticas. Os dados sao gravados como texto nos campos `descricao1` e `descricao2` das tabelas `lancamentos_financeiros` e `lancamentos_financeiros_itens`.

