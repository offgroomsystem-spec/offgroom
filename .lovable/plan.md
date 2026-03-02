

## Adicionar "Infraestrutura" e "Sistemas e Softwares" ao sistema

### Resumo

Adicionar duas novas categorias:
1. **Despesa > Despesa Nao Operacional > Infraestrutura**
2. **Despesa > Despesa Fixa > Sistemas e Softwares**

### Alteracoes

#### 1. Formularios de lancamento (2 arquivos)

**`src/pages/ControleFinanceiro.tsx`** e **`src/components/relatorios/financeiros/FluxoDeCaixa.tsx`**:
- Adicionar `"Infraestrutura"` na lista `categoriasDescricao2["Despesa Nao Operacional"]`
- Adicionar `"Sistemas e Softwares"` na lista `categoriasDescricao2["Despesa Fixa"]`

#### 2. Relatorio Despesas Nao Operacionais

**`src/components/relatorios/financeiros/DespesasNaoOperacionais.tsx`**:
- Adicionar `"Infraestrutura"` no array de categorias do grafico de barras (linha 242-246)
- Adicionar `<SelectItem>` para "Infraestrutura" no filtro de categoria (linha 569)
- Adicionar `<SelectItem>` para "Infraestrutura" no select de edicao (linha 1013)

#### 3. Relatorio Despesas Fixas

**`src/components/relatorios/financeiros/DespesasFixas.tsx`**:
- Adicionar calculo para "Sistemas e Softwares" no `dadosGraficoBarras` (linhas 264-286)
- Adicionar `<SelectItem>` para "Sistemas e Softwares" no filtro de categoria (linha 688)
- Adicionar `<SelectItem>` para "Sistemas e Softwares" no select de edicao (linha 1172)

### Detalhes tecnicos

Nenhuma alteracao no banco de dados. As categorias sao listas estaticas no frontend armazenadas como texto nos campos `descricao2`.

