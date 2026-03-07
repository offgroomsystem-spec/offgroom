

## Correção: Filtrar transferências nos gráficos de 12 meses da /home

### Problema

Três gráficos na página `/home` ainda somam transferências entre contas nos cálculos:

1. **Faturamento Médio do Mês (12 meses)** — linha 670: receitas sem filtro de transferência
2. **Faturamento/Despesas (12 meses)** — linhas 850 e 858: receitas e despesas sem filtro

Os KPIs principais e o gráfico de fluxo de caixa 30 dias já estão corretos.

### Alterações

**Arquivo:** `src/components/dashboard/DashboardContent.tsx`

- **Linha ~671** (`dadosFaturamentoMedio12Meses`): Adicionar `if (l.observacao === "Transferência entre contas") return false;` no filtro de receitas
- **Linha ~851** (`dadosFaturamentoDespesas12Meses`): Adicionar filtro de transferência no cálculo de receitas
- **Linha ~859**: Adicionar filtro de transferência no cálculo de despesas

São 3 pontos de correção no mesmo arquivo — apenas adicionar a condição que já existe nos outros blocos.

