
# Plano: Pagina "Graficos Financeiros" no Modulo de Relatorios

## Resumo

Criar um novo Card "Graficos Financeiros" na aba "Financeiro" da pagina de Relatorios (antes do "Fluxo de Caixa"), que abre uma pagina completa dedicada a analise financeira com graficos interativos, reutilizando a mesma logica de dados e estilo visual da pagina /home.

---

## Parte 1: Novo Card na Pagina de Relatorios

### Alteracao em `src/pages/Relatorios.tsx`

Adicionar o card "Graficos Financeiros" como primeiro item no array de relatorios financeiros (linha 185), antes do "Fluxo de Caixa":

```text
{ id: "graficos-financeiros", titulo: "Graficos Financeiros", desc: "Painel completo de analise visual da saude financeira da empresa" }
```

Adicionar a renderizacao condicional do novo componente (linha ~91):

```text
{relatorioAtivo === "graficos-financeiros" && <GraficosFinanceiros />}
```

Adicionar "graficos-financeiros" na lista de relatorios conhecidos (linha ~98).

---

## Parte 2: Novo Componente `GraficosFinanceiros`

### Arquivo: `src/components/relatorios/financeiros/GraficosFinanceiros.tsx`

Este sera um componente grande e completo que carrega os dados financeiros e renderiza todos os graficos solicitados.

### Dados Carregados

O componente ira buscar do banco:
- `lancamentos_financeiros` com `lancamentos_financeiros_itens` (ultimos 365 dias)
- `empresa_config` (dias_funcionamento, meta_faturamento_mensal)
- `contas_bancarias` (para saldo acumulado)

### Filtro de Periodo

Um seletor no topo da pagina permitira filtrar por:
- Ultimos 12 meses (padrao)
- Ultimos 6 meses
- Ano atual
- Ano anterior

---

## Parte 3: Graficos Implementados

### Linha 1 - Cards Comparativos (Mes Atual x Mes Anterior)

4 mini-cards com indicadores visuais:

```text
+-------------+  +-------------+  +-------------+  +-------------+
| Receita     |  | Despesas    |  | Lucro       |  | Margem      |
| R$ 20.000   |  | R$ 12.000   |  | R$ 8.000    |  | 40%         |
| +15% verde  |  | -5% verde   |  | +25% verde  |  | +3pp verde  |
+-------------+  +-------------+  +-------------+  +-------------+
```

Cada card mostra seta para cima/baixo e percentual verde/vermelho.

### Linha 2 - Graficos de 3 Colunas (Desktop)

**Grafico 1: Comparativo Receitas x Despesas (BarChart)**
- Barras agrupadas verdes (receitas) e vermelhas (despesas), ultimos 12 meses
- Destaque visual quando despesas > receitas (borda/fundo vermelho claro)
- Tooltip com valores e percentual

**Grafico 2: Faturamento/Despesas dos Ultimos 12 Meses (LineChart)**
- Mesmo grafico identico ao da /home com linha de meta cinza tracejada
- Reutiliza a mesma logica de calculo

**Grafico 3: Faturamento Medio do Mes (LineChart)**
- Mesmo grafico identico ao da /home com linha de meta media
- Calculo: receitas pagas / dias uteis trabalhados

### Linha 3 - Graficos de 3 Colunas

**Grafico 4: Fluxo de Caixa - Ultimos 30 Dias (LineChart)**
- Mesmo grafico identico ao da /home com meta diaria e filtro de dias uteis

**Grafico 5: Resultado Liquido Mensal (BarChart)**
- Barras verticais mostrando lucro/prejuizo mes a mes
- Barras verdes para lucro positivo, vermelhas para prejuizo
- Tooltip com receitas, despesas e resultado

**Grafico 6: Margem de Lucro % por Mes (LineChart)**
- Linha mostrando (receitas - despesas) / receitas * 100 por mes
- Linha de referencia em 0% (ponto de equilibrio)
- Cores: acima de 0 verde, abaixo vermelho

### Linha 4 - Graficos de Pizza Receitas (3 colunas)

**3 Graficos de Pizza - Receitas por Categoria**

```text
+------------------+  +------------------+  +------------------+
| Fev/2026         |  | Jan/2026         |  | Dez/2025         |
| (Mes Atual)      |  | (Mes Anterior)   |  | (2 meses atras)  |
|                  |  |                  |  |                  |
|    [PIE CHART]   |  |    [PIE CHART]   |  |    [PIE CHART]   |
|                  |  |                  |  |                  |
| Legenda:         |  | Legenda:         |  | Legenda:         |
| * Servicos       |  | * Servicos       |  | * Servicos       |
| * Venda          |  | * Venda          |  | * Venda          |
| * Outras         |  | * Outras         |  | * Outras         |
+------------------+  +------------------+  +------------------+
```

Cada pizza separa receitas por `descricao1` (Receita Operacional, Receita Nao Operacional) e por subcategoria (`descricao2` dos itens: Servicos, Venda, etc).

Tooltip: nome da categoria + valor R$ + percentual %.

### Linha 5 - Graficos de Pizza Despesas (3 colunas)

Mesmo modelo, 3 graficos lado a lado para despesas:
- Categorias: Despesa Fixa, Despesa Operacional, Despesa Nao Operacional
- Subcategorias dos itens (Aluguel, Energia, Contador, etc.)

### Linha 6 - Graficos de 3 Colunas

**Grafico: Evolucao do Caixa Acumulado (LineChart)**
- Linha mostrando saldo acumulado (receitas - despesas) mes a mes de forma cumulativa
- Area preenchida abaixo da linha

**Grafico: Top 5 Categorias que Mais Geram Receita (BarChart horizontal)**
- Barras horizontais verdes ordenadas por valor
- Agrega por `descricao2` dos itens de receita

**Grafico: Top 5 Categorias que Mais Geram Despesa (BarChart horizontal)**
- Barras horizontais vermelhas ordenadas por valor
- Agrega por `descricao2` dos itens de despesa

### Linha 7 - Graficos de 3 Colunas

**Grafico: Ponto de Equilibrio (indicador visual)**
- Card com gauge/indicador mostrando se a empresa esta acima ou abaixo do ponto de equilibrio
- Receitas vs Despesas do mes atual
- Barra de progresso visual

**Grafico: Ticket Medio Mensal (LineChart)**
- Calculo: total receitas do mes / numero de lancamentos de receita do mes
- Linha com evolucao dos ultimos 12 meses

**Grafico: Sazonalidade Financeira (BarChart)**
- Agrega receitas por mes do ano (Jan-Dez) independente do ano
- Mostra quais meses sao historicamente mais fortes/fracos
- Usa dados de todos os meses disponiveis

---

## Parte 4: Detalhes Tecnicos

### Importacoes Recharts

```typescript
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from "recharts";
```

### Paleta de Cores para Graficos de Pizza

```typescript
const CORES_RECEITA = ["#22c55e", "#16a34a", "#15803d", "#166534", "#14532d", "#a3e635", "#84cc16"];
const CORES_DESPESA = ["#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d", "#f97316", "#fb923c"];
```

### Formatacao de Moeda

```typescript
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
```

### Calculo de Dias Uteis

Reutiliza a mesma logica da /home baseada no campo `dias_funcionamento` da empresa.

### Responsividade

- Desktop: grid 3 colunas (`grid-cols-1 lg:grid-cols-2 xl:grid-cols-3`)
- Tablet: 2 colunas
- Mobile: 1 coluna
- Graficos com `ResponsiveContainer width="100%" height={300}`

---

## Parte 5: Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/relatorios/financeiros/GraficosFinanceiros.tsx` | CRIAR - Componente completo com todos os graficos |
| `src/pages/Relatorios.tsx` | MODIFICAR - Adicionar card e rota para o novo componente |

---

## Parte 6: Layout Visual Final

```text
+----------------------------------------------------------+
| [Voltar]     Graficos Financeiros                        |
|              Filtro: [Ultimos 12 meses v]                |
+----------------------------------------------------------+

+----------------------------------------------------------+
| Receita     | Despesas    | Lucro       | Margem          |
| R$ 20.000   | R$ 12.000   | R$ 8.000    | 40%             |
| +15%        | -5%         | +25%        | +3pp            |
+----------------------------------------------------------+

+----------------------------------------------------------+
| Comparativo   | Faturamento/   | Faturamento             |
| Receitas x    | Despesas       | Medio do                |
| Despesas      | 12 meses       | mes                     |
+----------------------------------------------------------+
| Fluxo de      | Resultado      | Margem de               |
| Caixa 30d     | Liquido Mensal | Lucro %                 |
+----------------------------------------------------------+
| Pizza Receita | Pizza Receita  | Pizza Receita           |
| Mes Atual     | Mes Anterior   | 2 meses atras           |
+----------------------------------------------------------+
| Pizza Despesa | Pizza Despesa  | Pizza Despesa           |
| Mes Atual     | Mes Anterior   | 2 meses atras           |
+----------------------------------------------------------+
| Evolucao      | Top 5 Receita  | Top 5 Despesa           |
| Caixa Acum.   | (barras horiz) | (barras horiz)          |
+----------------------------------------------------------+
| Ponto de      | Ticket Medio   | Sazonalidade            |
| Equilibrio    | Mensal         | Financeira              |
+----------------------------------------------------------+
```

Todos os graficos com tooltips ao passar o mouse, legendas claras, valores formatados em R$ e cores intuitivas (verde/vermelho/cinza).
