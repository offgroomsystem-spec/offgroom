
# Plano: Ajustes no Card "Ponto de Equilíbrio" e Gráfico "Sazonalidade Financeira"

## 1. Card "Ponto de Equilíbrio" - Exibir últimos 3 meses

### Alteração em `src/hooks/useFinancialData.ts`

Substituir o `pontoEquilibrio` atual (que retorna apenas o mês atual) por um array com os últimos 3 meses:

```typescript
const pontoEquilibrio = useMemo(() => {
  if (dadosMensais.length === 0) return [];
  const ultimos3 = dadosMensais.slice(-3);
  return ultimos3.map((d, i) => ({
    mes: d.mes,
    mesLabel: d.mesLabel,
    receitas: d.receitas,
    despesas: d.despesas,
    percentual: d.despesas > 0 ? (d.receitas / d.despesas) * 100 : 0,
    isAtual: i === ultimos3.length - 1,
  }));
}, [dadosMensais]);
```

### Alteração em `src/components/relatorios/financeiros/GraficosFinanceiros.tsx`

Atualizar o card para iterar sobre os 3 meses com layout vertical, do mais antigo ao mais recente:

- Título atualizado: "Ponto de Equilíbrio - Últimos 3 Meses"
- Cada mês exibe: label do mês, percentual, barra de progresso, receitas e despesas
- Mês atual recebe destaque visual (borda ou badge "Mês Atual")
- Ordem: mais antigo no topo, mais recente embaixo

---

## 2. Gráfico "Sazonalidade Financeira" - Últimos 12 meses cronológicos

### Alteração em `src/hooks/useFinancialData.ts`

Substituir a lógica atual (que agrega por nome do mês Jan-Dez misturando anos) por uma lógica que usa os últimos 12 meses em ordem cronológica. Como `dadosMensais` já contém exatamente os últimos 12 meses em ordem, basta reutilizá-lo:

```typescript
const sazonalidade = useMemo(() => {
  return dadosMensais.map((d) => ({
    name: d.mes,       // ex: "mar/25", "abr/25", ..., "fev/26"
    total: d.receitas,
  }));
}, [dadosMensais]);
```

Isso garante que o gráfico sempre termina no mês atual e segue ordem cronológica sem misturar anos.

### Alteração em `src/components/relatorios/financeiros/GraficosFinanceiros.tsx`

- Atualizar subtítulo: "Receita dos últimos 12 meses"
- O restante do gráfico (BarChart, tooltip, cores) permanece igual

---

## Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useFinancialData.ts` | `pontoEquilibrio` vira array de 3 meses; `sazonalidade` usa `dadosMensais` |
| `src/components/relatorios/financeiros/GraficosFinanceiros.tsx` | Card Ponto de Equilíbrio exibe 3 meses; Sazonalidade com subtítulo atualizado |
