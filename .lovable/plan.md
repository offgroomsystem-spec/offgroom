
# Plano: Novo Gráfico "Faturamento/Despesas dos Últimos 12 Meses"

## Resumo do Pedido

Criar um novo gráfico de linhas que exiba receitas (linha verde) e despesas (linha vermelha) dos últimos 12 meses, posicionado à **esquerda** do gráfico "Fluxo de Caixa - Últimos 30 dias", resultando em 4 gráficos lado a lado no desktop.

---

## Problema Identificado: Consulta Limitada

Atualmente, a consulta de lançamentos financeiros está limitada aos **últimos 90 dias**:

```typescript
// Linha 80-84 - Consulta atual (PROBLEMA)
const { data: lancamentosData } = await supabase
  .from("lancamentos_financeiros")
  .select("*, lancamentos_financeiros_itens(*)")
  .eq("user_id", ownerId)
  .gte("data_pagamento", format(ultimos90Dias, "yyyy-MM-dd"));
```

Para exibir 12 meses, precisamos buscar lançamentos dos **últimos 365 dias**.

---

## Implementação

### 1. Alterar a Consulta de Lançamentos (Linha 80-84)

Buscar lançamentos dos últimos 365 dias em vez de 90:

```typescript
const ultimos365Dias = subDays(hoje, 365);

const { data: lancamentosData } = await supabase
  .from("lancamentos_financeiros")
  .select("*, lancamentos_financeiros_itens(*)")
  .eq("user_id", ownerId)
  .gte("data_pagamento", format(ultimos365Dias, "yyyy-MM-dd"));
```

### 2. Criar `useMemo` para Dados do Novo Gráfico

Adicionar após `dadosCrescimentoAgendamentos` (linha ~640):

```typescript
// Dados para gráfico de Faturamento/Despesas (últimos 12 meses)
const dadosFaturamentoDespesas12Meses = useMemo(() => {
  const dados: any[] = [];

  for (let i = 11; i >= 0; i--) {
    const mes = subMonths(new Date(), i);
    const inicioMes = startOfMonth(mes);
    const fimMes = endOfMonth(mes);

    if (isRecepcionista) {
      dados.push({
        mes: format(mes, "MMM/yy", { locale: ptBR }),
        receitas: 0,
        despesas: 0,
      });
      continue;
    }

    // Receitas do mês (pagas)
    const receitas = lancamentos
      .filter((l) => {
        if (l.tipo !== "Receita" || !l.pago || !l.data_pagamento) return false;
        const data = new Date(l.data_pagamento);
        return data >= inicioMes && data <= fimMes;
      })
      .reduce((acc, l) => acc + Number(l.valor_total), 0);

    // Despesas do mês (pagas)
    const despesas = lancamentos
      .filter((l) => {
        if (l.tipo !== "Despesa" || !l.pago || !l.data_pagamento) return false;
        const data = new Date(l.data_pagamento);
        return data >= inicioMes && data <= fimMes;
      })
      .reduce((acc, l) => acc + Number(l.valor_total), 0);

    dados.push({
      mes: format(mes, "MMM/yy", { locale: ptBR }),
      receitas,
      despesas,
    });
  }

  return dados;
}, [lancamentos, isRecepcionista]);
```

### 3. Alterar Layout dos Gráficos (Linha 829)

Mudar de 3 colunas para **4 colunas** no desktop:

```typescript
<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
```

### 4. Adicionar o Novo Gráfico (Antes do "Fluxo de Caixa")

```typescript
{/* Gráfico Faturamento/Despesas - 12 Meses */}
<Card>
  <CardHeader>
    <CardTitle className="text-lg">Faturamento/Despesas dos últimos 12 meses</CardTitle>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={dadosFaturamentoDespesas12Meses} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
        <YAxis width={40} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number) =>
            new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(value)
          }
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="receitas" 
          stroke="#22c55e" 
          name="Receitas" 
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line 
          type="monotone" 
          dataKey="despesas" 
          stroke="#ef4444" 
          name="Despesas" 
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

---

## Layout Final em Desktop (4 colunas)

```text
┌───────────────────┬───────────────────┬───────────────────┬───────────────────┐
│  Faturamento/     │  Fluxo de Caixa   │  Evolução de      │  Média do Mês de  │
│  Despesas dos     │  Últimos 30 dias  │  Atendimentos     │  Atendimentos     │
│  últimos 12 meses │                   │  Últimos 12 meses │  Realizados       │
│                   │                   │                   │                   │
│  📈 Linha Verde   │  📈 Linha Verde   │  📈 Linha Azul    │  📈 Linha Roxa    │
│     (Receitas)    │     (Receitas)    │     (Qtd)         │     (Média)       │
│  📉 Linha Vermelha│  📉 Linha Vermelha│                   │                   │
│     (Despesas)    │     (Despesas)    │                   │                   │
└───────────────────┴───────────────────┴───────────────────┴───────────────────┘
```

---

## Resumo das Alterações

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `DashboardContent.tsx` | 55 | Adicionar variável `ultimos365Dias` |
| `DashboardContent.tsx` | 80-84 | Alterar filtro de lançamentos para 365 dias |
| `DashboardContent.tsx` | ~641 | Adicionar `useMemo` para `dadosFaturamentoDespesas12Meses` |
| `DashboardContent.tsx` | 829 | Alterar grid para `xl:grid-cols-4` |
| `DashboardContent.tsx` | 830 | Inserir novo Card com gráfico antes do Fluxo de Caixa |

---

## Detalhes Técnicos

### Cores das Linhas
- **Receitas**: `#22c55e` (verde - Tailwind green-500)
- **Despesas**: `#ef4444` (vermelho - Tailwind red-500)

### Período do Gráfico
Se hoje é fevereiro de 2026, o gráfico mostrará:
- Fev/25, Mar/25, Abr/25, Mai/25, Jun/25, Jul/25, Ago/25, Set/25, Out/25, Nov/25, Dez/25, Jan/26, Fev/26

### Tooltip
Formatação em moeda brasileira (R$) para valores de receitas e despesas.

---

## Testes a Realizar

1. **Verificar dados do gráfico**: Confirmar que os valores de receitas e despesas correspondem aos lançamentos financeiros reais de cada mês
2. **Responsividade**: Verificar layout em desktop (4 colunas) e mobile (1 coluna)
3. **Recepcionista**: Verificar que o gráfico mostra valores zerados para usuários com perfil de recepcionista
