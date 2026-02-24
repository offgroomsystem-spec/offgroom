

## Corrigir valores financeiros incorretos nos graficos e relatorios

### Problema identificado

Encontrei a causa raiz: um **bug de timezone** nas comparacoes de datas. Quando o codigo faz `new Date("2026-01-15")`, o JavaScript interpreta como meia-noite UTC. Porem, `startOfMonth(new Date())` e `endOfMonth(new Date())` usam o fuso local (UTC-3 no Brasil). Isso causa um deslocamento de 3 horas nas comparacoes, fazendo com que lancamentos do inicio de um mes sejam contabilizados no mes anterior, e lancamentos do inicio do proximo mes vazem para o mes atual.

Exemplo pratico: um lancamento com `data_pagamento = "2026-02-01"` e parseado como `2026-02-01T00:00:00Z` (UTC), mas `startOfMonth(fevereiro)` no Brasil e `2026-02-01T03:00:00Z`. Como `00:00 < 03:00`, o lancamento de 1 de fevereiro e contabilizado em janeiro no grafico.

Isso explica a discrepancia: o grafico do Dashboard mostra R$21.703,82 em janeiro porque esta incluindo lancamentos que pertencem a outros meses.

Alem disso, adicionarei filtro `pago = true` diretamente nas queries ao banco onde os dados sao usados apenas para totais/graficos, evitando carregar dados desnecessarios.

### Alteracoes

#### 1. `src/components/dashboard/DashboardContent.tsx`

**Corrigir todas as comparacoes de datas nos useMemo** que usam `new Date(l.data_pagamento)` comparando com `startOfMonth`/`endOfMonth`:

- **faturamentoMes** (~linha 498): Trocar `new Date(l.data_pagamento)` por comparacao de strings
- **dadosFaturamentoMedio12Meses** (~linha 669-674): Trocar por comparacao de strings
- **dadosFaturamentoDespesas12Meses** (~linha 849-862): Trocar por comparacao de strings

Abordagem: converter os limites de mes para string `format(data, "yyyy-MM-dd")` e comparar diretamente com `l.data_pagamento` (que ja e string "YYYY-MM-DD"):

```typescript
// ANTES (bug de timezone):
const data = new Date(l.data_pagamento);
return data >= inicioMes && data <= fimMes;

// DEPOIS (correto):
const inicioStr = format(inicioMes, "yyyy-MM-dd");
const fimStr = format(fimMes, "yyyy-MM-dd");
return l.data_pagamento >= inicioStr && l.data_pagamento <= fimStr;
```

Tambem adicionar `.eq("pago", true)` na query de lancamentos do dashboard (~linha 83) para nao carregar lancamentos nao pagos desnecessariamente para os graficos. Porem, como os KPIs de "Entradas Previstas" e "Saidas Previstas" precisam de `pago = false`, manter a query sem filtro de pago e garantir que todos os `useMemo` que calculam totais filtrem corretamente por `l.pago`.

#### 2. `src/hooks/useFinancialData.ts`

**Corrigir todas as comparacoes de datas nos useMemo**:

- **dadosMensais** (linhas 91, 95, 113): Trocar `new Date(l.data_pagamento) >= inicio && new Date(l.data_pagamento) <= fim` por comparacao de strings
- **categoriasPorMes** (linhas 189, 192): Mesma correcao

```typescript
// ANTES:
.filter((l) => l.tipo === "Receita" && l.pago && l.data_pagamento && 
  new Date(l.data_pagamento) >= inicio && new Date(l.data_pagamento) <= fim)

// DEPOIS:
const inicioStr = format(inicio, "yyyy-MM-dd");
const fimStr = format(fim, "yyyy-MM-dd");
// ...
.filter((l) => l.tipo === "Receita" && l.pago && l.data_pagamento && 
  l.data_pagamento >= inicioStr && l.data_pagamento <= fimStr)
```

#### 3. Relatorios individuais

Os relatorios de ReceitaOperacional, DespesasOperacionais, DespesasNaoOperacionais, ReceitaNaoOperacional, DespesasFixas e PontoEquilibrio carregam dados individuais para listar na tabela, entao incluir pagos e nao pagos faz sentido. Porem, os **KPIs e graficos agregados** dentro desses relatorios que usam `new Date(l.dataPagamento)` para comparar com `startOfMonth`/`endOfMonth` precisam da mesma correcao de timezone. Vou verificar e corrigir cada um.

### Detalhes tecnicos

- O campo `data_pagamento` no banco e do tipo `date` (sem hora), armazenado como string "YYYY-MM-DD"
- Comparacoes de string "YYYY-MM-DD" funcionam corretamente para ordenacao cronologica
- Nenhuma alteracao no banco de dados e necessaria
- A correcao e puramente no frontend, nas comparacoes de datas dentro dos `useMemo`
- Total de 612 registros para o usuario principal, abaixo do limite de 1000 do banco, entao nao ha perda de dados por truncamento

### Arquivos afetados

1. `src/components/dashboard/DashboardContent.tsx` - graficos do Dashboard
2. `src/hooks/useFinancialData.ts` - dados usados pelo GraficosFinanceiros e Relatorios
3. Verificacao/correcao em componentes de relatorios se houver agregacoes com o mesmo bug

