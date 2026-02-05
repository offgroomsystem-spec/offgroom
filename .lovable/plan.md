
# Plano: Melhorias nos Graficos do Dashboard

## Resumo das Solicitacoes

1. **Grafico "Faturamento/Despesas dos ultimos 12 meses"**: Adicionar linha horizontal cinza com a meta de faturamento mensal
2. **Novo Grafico "Faturamento Medio do mes"**: Calcular media diaria de faturamento por dias uteis trabalhados + linha de meta media
3. **Grafico "Fluxo de Caixa - Ultimos 30 dias"**: Corrigir para incluir o dia atual + adicionar linha de meta diaria + filtrar apenas dias de funcionamento (com excecao para dias com faturamento)
4. **Reorganizar Layout**: 3 graficos por linha em desktop
5. **Remover "Clientes Recentes"**

---

## Parte 1: Carregar Meta de Faturamento Mensal

O campo `meta_faturamento_mensal` ja existe na tabela `empresa_config`. Preciso carregar este valor junto com os dias de funcionamento.

### Alteracao no `loadData()` (linha ~94-110)

```typescript
// Carregar configuracao da empresa
const { data: empresaConfig } = await supabase
  .from("empresa_config")
  .select("dias_funcionamento, meta_faturamento_mensal")
  .eq("user_id", ownerId)
  .single();

setDiasFuncionamento(empresaConfig?.dias_funcionamento || {...});
setMetaFaturamentoMensal(empresaConfig?.meta_faturamento_mensal || 0);
```

### Novo State

```typescript
const [metaFaturamentoMensal, setMetaFaturamentoMensal] = useState<number>(0);
```

---

## Parte 2: Adicionar Linha de Meta no Grafico "Faturamento/Despesas 12 Meses"

### Importar ReferenceLine do Recharts

```typescript
import { ReferenceLine } from "recharts";
```

### Adicionar ao Grafico

A linha sera horizontal e constante, representando a meta mensal:

```typescript
<ReferenceLine
  y={metaFaturamentoMensal}
  stroke="#9ca3af"
  strokeDasharray="5 5"
  strokeWidth={2}
  label={{
    value: "Meta",
    position: "insideTopRight",
    fill: "#9ca3af",
    fontSize: 12,
  }}
/>
```

### Tooltip Personalizado

Adicionar deteccao de hover na linha de meta para mostrar o valor:

```typescript
// No tooltip, adicionar verificacao se o mouse esta sobre a linha de meta
```

---

## Parte 3: Novo Grafico "Faturamento Medio do Mes"

### Logica de Calculo

Para cada mes dos ultimos 12 meses:
1. Calcular total de receitas pagas do mes
2. Contar dias uteis trabalhados baseado no `dias_funcionamento`
3. Dividir: `media = totalReceitas / diasUteis`

### Linha de Meta Media

Para cada mes, calcular a meta media:
- `metaMedia = metaFaturamentoMensal / diasUteisMes`

Essa linha NAO sera reta, pois cada mes tem quantidade diferente de dias uteis.

### useMemo `dadosFaturamentoMedio12Meses`

```typescript
const dadosFaturamentoMedio12Meses = useMemo(() => {
  const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  const dados: any[] = [];

  for (let i = 11; i >= 0; i--) {
    const mes = subMonths(new Date(), i);
    const inicioMes = startOfMonth(mes);
    const fimMes = endOfMonth(mes);
    const hoje = new Date();
    const dataFinal = i === 0 ? hoje : fimMes;

    // Contar dias uteis do mes
    let diasUteis = 0;
    let dataAtual = new Date(inicioMes);
    while (dataAtual <= dataFinal) {
      const diaDaSemana = diasSemana[dataAtual.getDay()];
      if (diasFuncionamento?.[diaDaSemana]) diasUteis++;
      dataAtual = addDays(dataAtual, 1);
    }

    // Calcular receitas do mes (pagas)
    const receitas = lancamentos
      .filter((l) => {
        if (l.tipo !== "Receita" || !l.pago || !l.data_pagamento) return false;
        const data = new Date(l.data_pagamento);
        return data >= inicioMes && data <= dataFinal;
      })
      .reduce((acc, l) => acc + Number(l.valor_total), 0);

    const media = diasUteis > 0 ? receitas / diasUteis : 0;
    const metaMedia = diasUteis > 0 ? metaFaturamentoMensal / diasUteis : 0;

    dados.push({
      mes: format(mes, "MMM/yy", { locale: ptBR }),
      media,
      metaMedia,
      diasUteis,
    });
  }

  return dados;
}, [lancamentos, diasFuncionamento, metaFaturamentoMensal]);
```

### Componente do Grafico

```typescript
<Card>
  <CardHeader>
    <CardTitle className="text-lg">Faturamento Medio do mes</CardTitle>
    <p className="text-xs text-muted-foreground">
      Media diaria de faturamento considerando dias uteis trabalhados
    </p>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={dadosFaturamentoMedio12Meses}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
        <YAxis width={50} tick={{ fontSize: 12 }} />
        <Tooltip content={...} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="media" 
          stroke="#22c55e" 
          name="Media Diaria" 
          strokeWidth={2}
        />
        <Line 
          type="monotone" 
          dataKey="metaMedia" 
          stroke="#9ca3af" 
          name="Meta Media" 
          strokeWidth={2}
          strokeDasharray="5 5"
        />
      </LineChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

---

## Parte 4: Corrigir "Fluxo de Caixa - Ultimos 30 dias"

### Problemas Identificados

1. **Nao mostra o dia atual**: O loop vai de `i = 0` ate `i < 30`, mas comeca em `ultimos30Dias = subDays(new Date(), 30)`, ou seja, mostra de 30 dias atras ate ontem.

2. **Mostra dias nao trabalhados**: Precisa filtrar apenas dias de funcionamento, exceto se houver faturamento.

### Correcao para Incluir Hoje

```typescript
// Mudar de:
const ultimos30Dias = subDays(new Date(), 30);
for (let i = 0; i < 30; i++) {
  const data = addDays(ultimos30Dias, i);

// Para:
const ultimos30Dias = subDays(new Date(), 29); // 29 dias atras + hoje = 30 dias
for (let i = 0; i <= 29; i++) { // Incluir hoje
  const data = addDays(ultimos30Dias, i);
```

### Filtrar Dias de Funcionamento (com excecao)

```typescript
const dadosFluxoCaixa = useMemo(() => {
  const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
  const dados: any[] = [];
  const hoje = new Date();
  
  // Gerar todos os 30 dias
  for (let i = 29; i >= 0; i--) {
    const data = subDays(hoje, i);
    const dataStr = format(data, "yyyy-MM-dd");
    const diaDaSemana = diasSemana[data.getDay()];
    
    // Verificar se e dia de funcionamento
    const eDiaFuncionamento = diasFuncionamento?.[diaDaSemana] === true;
    
    // Calcular receitas e despesas do dia
    const receitas = lancamentos
      .filter((l) => l.tipo === "Receita" && l.pago && l.data_pagamento === dataStr)
      .reduce((acc, l) => acc + Number(l.valor_total), 0);
    
    const despesas = lancamentos
      .filter((l) => l.tipo === "Despesa" && l.pago && l.data_pagamento === dataStr)
      .reduce((acc, l) => acc + Number(l.valor_total), 0);
    
    // Verificar se teve faturamento (excecao para dias nao trabalhados)
    const teveFaturamento = receitas > 0 || despesas > 0;
    
    // Incluir apenas se: e dia de funcionamento OU teve faturamento
    if (eDiaFuncionamento || teveFaturamento) {
      dados.push({
        data: format(data, "dd/MM", { locale: ptBR }),
        dataCompleta: data,
        receitas,
        despesas,
        metaDiaria, // Calcular baseado no mes
      });
    }
  }
  
  return dados;
}, [lancamentos, diasFuncionamento, metaFaturamentoMensal]);
```

### Adicionar Linha de Meta Diaria

Para cada dia, a meta diaria = `metaFaturamentoMensal / diasUteisMes`:

```typescript
// Para cada dia, calcular quantos dias uteis tem no mes daquele dia
const calcularMetaDiaria = (data: Date) => {
  const inicioMes = startOfMonth(data);
  const fimMes = endOfMonth(data);
  let diasUteisMes = 0;
  let d = new Date(inicioMes);
  while (d <= fimMes) {
    if (diasFuncionamento?.[diasSemana[d.getDay()]]) diasUteisMes++;
    d = addDays(d, 1);
  }
  return diasUteisMes > 0 ? metaFaturamentoMensal / diasUteisMes : 0;
};
```

---

## Parte 5: Reorganizar Layout dos Graficos

### Layout Atual (4 colunas)

```text
[Faturamento/Despesas] [Fluxo de Caixa] [Evolucao Atend.] [Media Atend.]
```

### Novo Layout (2 linhas de 3)

**Linha 1:**
```text
[Faturamento/Despesas 12m] [Faturamento Medio mes] [Fluxo de Caixa 30d]
```

**Linha 2:**
```text
[Evolucao Atendimentos 12m] [Media Atendimentos] [Contas a Vencer]
```

### Alteracao no Grid (linha ~903)

```typescript
// Linha 1: 3 graficos financeiros
<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
  {/* Faturamento/Despesas 12 meses */}
  {/* Faturamento Medio do mes (NOVO) */}
  {/* Fluxo de Caixa 30 dias */}
</div>

// Linha 2: 2 graficos de atendimentos + Contas a Vencer
<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
  {/* Evolucao de Atendimentos */}
  {/* Media de Atendimentos */}
  {/* Contas a Vencer (movido de baixo) */}
</div>
```

---

## Parte 6: Remover "Clientes Recentes"

Remover o componente `NovosClientes` da renderizacao (linha ~1133):

```typescript
// ANTES:
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <ContasProximasVencimento lancamentos={lancamentos} />
  <NovosClientes clientes={clientes} /> // REMOVER
</div>

// DEPOIS:
// O ContasProximasVencimento vai para a linha dos graficos
```

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `DashboardContent.tsx` | Adicionar state `metaFaturamentoMensal` |
| `DashboardContent.tsx` | Carregar `meta_faturamento_mensal` do banco |
| `DashboardContent.tsx` | Importar `ReferenceLine` do recharts |
| `DashboardContent.tsx` | Adicionar linha de meta no grafico de 12 meses |
| `DashboardContent.tsx` | Criar `useMemo` para `dadosFaturamentoMedio12Meses` |
| `DashboardContent.tsx` | Adicionar novo grafico "Faturamento Medio do mes" |
| `DashboardContent.tsx` | Corrigir `dadosFluxoCaixa` para incluir hoje |
| `DashboardContent.tsx` | Filtrar dias de funcionamento no Fluxo de Caixa |
| `DashboardContent.tsx` | Adicionar meta diaria no grafico Fluxo de Caixa |
| `DashboardContent.tsx` | Reorganizar layout para 3 graficos por linha |
| `DashboardContent.tsx` | Mover ContasProximasVencimento para linha 2 |
| `DashboardContent.tsx` | Remover NovosClientes |

---

## Visualizacao do Layout Final (Desktop)

```text
+----------------------------------------------------------+
|                    CARDS DE KPIs (5 cards)                |
+----------------------------------------------------------+
|                    CARDS DE KPIs (4 cards)                |
+----------------------------------------------------------+

+----------------------------------------------------------+
| Faturamento/Despesas  | Faturamento Medio   | Fluxo de   |
| ultimos 12 meses      | do mes              | Caixa 30d  |
| (com linha meta)      | (com linha meta)    | (filtrado) |
+----------------------------------------------------------+
| Evolucao de           | Media do Mes de     | Contas a   |
| Atendimentos 12m      | Atendimentos        | Vencer     |
+----------------------------------------------------------+
```

---

## Detalhes Tecnicos

### Cores das Linhas
- **Receitas/Faturamento**: `#22c55e` (verde)
- **Despesas**: `#ef4444` (vermelho)
- **Meta**: `#9ca3af` (cinza) com `strokeDasharray="5 5"` (tracejada)

### Tooltips das Linhas de Meta
Quando o usuario passar o mouse sobre a linha de meta, o tooltip mostrara:
- "Meta Mensal: R$ X.XXX,XX" (para o grafico de 12 meses)
- "Meta Media: R$ X.XXX,XX/dia" (para o grafico de faturamento medio)
- "Meta Diaria: R$ X.XXX,XX" (para o fluxo de caixa)

### Calculo de Dias Uteis
Baseado no campo `dias_funcionamento` da tabela `empresa_config`:
```json
{
  "segunda": true,
  "terca": true,
  "quarta": true,
  "quinta": true,
  "sexta": true,
  "sabado": false,
  "domingo": false
}
```

Se segunda a sexta = 5 dias uteis por semana.
