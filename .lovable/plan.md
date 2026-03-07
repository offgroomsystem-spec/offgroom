

## Correção: Excluir Transferências entre Contas dos Relatórios e Gráficos

### Problema Identificado

Quando o usuário faz uma transferência entre contas bancárias (ex: Ton → Pagseguro), o sistema cria **dois lançamentos**: uma "Despesa Não Operacional" na conta de origem e uma "Receita Não Operacional" na conta de destino, ambos com `observacao: "Transferência entre contas"`.

Esses lançamentos são **corretamente** usados para calcular saldos bancários individuais, mas estão **inflando** os totais de receita e despesa nos relatórios, pois transferências internas não representam faturamento real nem gasto real.

### Solução

Filtrar lançamentos com `observacao === "Transferência entre contas"` em todos os cálculos de receita/despesa/lucro/margem dos relatórios e gráficos. **Manter** esses lançamentos apenas nos cálculos de saldo por conta bancária (onde são necessários).

### Arquivos e Locais Afetados

**1. `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`**
- Mapear o campo `observacao` no objeto formatado (linha ~552)
- No `metricas` (linha ~830): filtrar transferências nos cálculos de recebido/aReceber/pago/aPagar
- No `dadosMensais` (cálculos mensais): filtrar transferências
- No `calcularMetricasMes` (linha ~1565): filtrar transferências
- **NÃO alterar** `saldosPorBanco` nem `saldosPorBancoNaData` (precisam das transferências para saldo correto)

**2. `src/hooks/useFinancialData.ts`**
- O hook carrega todos os lançamentos e calcula receitas/despesas mensais, fluxo de caixa 30d, categorias, etc.
- Adicionar filtro `l.observacao !== "Transferência entre contas"` em todos os `filter` de receita/despesa nos `useMemo` (dadosMensais, dadosFluxoCaixa30d, categoriasPorMes, topCategorias)

**3. `src/components/dashboard/DashboardContent.tsx`**
- `faturamentoMes` (linha ~497): filtrar transferências
- `entradasPrevistas` e `saidasPrevistas` (linhas ~505-512): filtrar transferências
- `dadosFluxoCaixa` (linha ~544): filtrar transferências no gráfico de 30 dias

**4. `src/components/relatorios/financeiros/GraficosFinanceiros.tsx`**
- Usa `useFinancialData` hook — será corrigido automaticamente pelo hook

**5. `src/components/relatorios/financeiros/DRE.tsx`**
- `receitaNaoOperacional` e `despesaNaoOperacional` (linhas ~283-284): filtrar transferências
- A DRE já separa por `descricao1`, mas "Receita Não Operacional" e "Despesa Não Operacional" incluem transferências

**6. `src/components/relatorios/financeiros/PontoEquilibrio.tsx`**
- `totalDespesasNaoOperacionais` (linha ~139): filtrar transferências

**7. `src/hooks/useFinancialIntelligence.ts`**
- Já filtra apenas por `descricao1 === "Receita Operacional"`, então NÃO é afetado (transferências usam "Receita Não Operacional")

**8. `src/components/relatorios/financeiros/ReceitaNaoOperacional.tsx`** e **`DespesasNaoOperacionais.tsx`**
- Esses relatórios específicos mostram detalhes de receitas/despesas não operacionais — as transferências devem aparecer aqui (são lançamentos reais), mas com uma indicação visual de que são transferências internas

### Resumo Técnico

A correção consiste em adicionar o filtro `l.observacao !== "Transferência entre contas"` (ou equivalente) em ~15 pontos de cálculo distribuídos em 5 arquivos. O campo `observacao` já existe no banco e é populado automaticamente pelo sistema de transferências. Nos locais onde os dados são formatados (FluxoDeCaixa), o campo precisa ser mapeado primeiro.

### O que NÃO será alterado
- Cálculos de saldo por conta bancária (precisam das transferências)
- Listagem/tabela de lançamentos (o usuário deve ver as transferências)
- Central de Inteligência Financeira (já filtra apenas "Receita Operacional")

