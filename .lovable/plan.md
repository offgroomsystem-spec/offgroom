

## Plano: DRE dinamico baseado em `categoriasDescricao2` + Exportacao PDF

### Problema

O DRE atual tem subcategorias hardcoded. Faltam: Combustivel, Financiamentos, Sistemas e Softwares, Manutencao, Aplicacao Financeira, Infraestrutura, Retirada Caixa, Retirada Sócio, Venda de Ativo, Resgate de Aplicacao Financeira — todas presentes em `src/constants/categorias.ts` mas ausentes do DRE.

### Solucao

Reescrever o `useMemo` e a renderizacao do DRE para iterar dinamicamente sobre `categoriasDescricao1` e `categoriasDescricao2` importados de `src/constants/categorias.ts`. Qualquer subcategoria adicionada futuramente aparecera automaticamente.

### Alteracoes

**Arquivo: `src/components/relatorios/financeiros/DRE.tsx`**

1. **Importar categorias**: Adicionar import de `categoriasDescricao1` e `categoriasDescricao2` de `@/constants/categorias`.

2. **Reescrever `useMemo`**: Substituir calculos manuais por iteracao dinamica:
   - Para cada `descricao1` em `categoriasDescricao1["Receita"]` e `["Despesa"]`, iterar sobre `categoriasDescricao2[descricao1]`
   - Calcular valor de cada subcategoria via `somarSubcategoria()`
   - Calcular total de cada `descricao1` como soma das subcategorias
   - Manter estrutura DRE: Receita Op Bruta → Custos Op (Produtos para Banho + Material de Limpeza) → Lucro Bruto → Despesas Op → Despesas Fixas → Lucro Op → Resultado Nao Op → Lucro Liquido
   - Retornar objeto com maps `{ [descricao1]: { total, subcategorias: { [nome]: valor } } }`

3. **Reescrever renderizacao (linhas 586-676)**: Substituir DRERows hardcoded por loops:
   - Receita Operacional: loop sobre subcategorias de "Receita Operacional"
   - Custos Operacionais: manter "Produtos para Banho" e "Material de Limpeza" (extraidos de Despesa Operacional)
   - Despesas Operacionais: loop sobre subcategorias de "Despesa Operacional" (exceto as de custo)
   - Despesas Fixas: loop sobre subcategorias de "Despesa Fixa"
   - Receita Nao Operacional: loop sobre subcategorias
   - Despesa Nao Operacional: loop sobre subcategorias

4. **Botao "Baixar PDF"**: Adicionar botao ao lado dos filtros que gera um HTML A4 portrait com o DRE completo (mesmo estilo do ExportButton existente — abre popup, `window.print()`). Incluir titulo, periodo, data de geracao, e todas as linhas do DRE formatadas.

### Estrutura do DRE dinamico (renderizacao)

```text
(+) Receita Operacional Bruta ............ R$ X
    Servicos ............................. R$ X
    Venda ................................ R$ X
    Outras Receitas Operacionais ......... R$ X
---
(-) Custos Operacionais .................. R$ X
    Produtos para Banho .................. R$ X
    Material de Limpeza .................. R$ X
---
(=) Lucro Bruto .......................... R$ X
    Margem Bruta ......................... X%
---
(-) Despesas Operacionais ................ R$ X
    Combustivel .......................... R$ X    ← NOVO
    Contador ............................. R$ X
    Freelancer ........................... R$ X
    ... (todas de categoriasDescricao2)
---
(-) Despesas Fixas ....................... R$ X
    Aluguel .............................. R$ X
    Financiamentos ....................... R$ X    ← NOVO
    Sistemas e Softwares ................. R$ X    ← NOVO
    ... (todas de categoriasDescricao2)
---
(=) Lucro Operacional .................... R$ X
---
(+/-) Resultado Nao Operacional .......... R$ X
  (+) Receita Nao Operacional ............ R$ X
      Venda de Ativo ..................... R$ X    ← NOVO
      Resgate de Aplicacao Financeira .... R$ X    ← NOVO
      Outras Receitas Nao Operacionais ... R$ X    ← NOVO
  (-) Despesa Nao Operacional ............ R$ X
      Manutencao ......................... R$ X    ← NOVO
      Aplicacao Financeira ............... R$ X    ← NOVO
      Infraestrutura ..................... R$ X    ← NOVO
      Retirada Caixa ..................... R$ X    ← NOVO
      Retirada Socio ..................... R$ X    ← NOVO
      Outras Despesas Nao Operacionais ... R$ X    ← NOVO
---
(=) LUCRO LIQUIDO DO EXERCICIO ........... R$ X
    Margem Liquida ....................... X%
```

### Tecnico

- Custos Operacionais: "Produtos para Banho" e "Material de Limpeza" sao extraidos de "Despesa Operacional" e exibidos separadamente como custos diretos (padrao DRE pet shop)
- As demais subcategorias de "Despesa Operacional" aparecem na secao Despesas Operacionais
- PDF gerado via `window.open` + `window.print()` em formato A4 portrait, mesmo padrao do `ExportButton` existente

