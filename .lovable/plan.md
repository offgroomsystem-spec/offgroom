
# Plano: Subtitulo "Mes Atual" e Tooltips Educativos nos Cards Financeiros

## Alteracoes no arquivo `src/components/relatorios/financeiros/GraficosFinanceiros.tsx`

### 1. Importar componentes de Tooltip

Adicionar imports do Tooltip do Radix (ja disponivel no projeto):

```typescript
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
```

### 2. Criar funcao auxiliar para gerar texto do tooltip

Uma funcao `getTooltipText` que recebe o tipo do card (`receita`, `despesas`, `lucro`, `margem`) e os dados do comparativo, retornando o texto educativo dinamico conforme as regras especificadas.

**Logica por card:**

- **Receita**: Texto base sobre dinheiro que entrou + texto dinamico baseado na variacao (positiva = faturou mais, negativa = faturou menos)
- **Despesas**: Texto base sobre gastos + texto dinamico com intensidade (leve, moderado, elevado, muito elevado para aumento; reducao para queda)
- **Lucro**: Texto base sobre o que sobrou + texto dinamico (lucro positivo crescendo, caindo, ou negativo = prejuizo)
- **Margem**: Texto base + exemplo didatico (60% = R$0,60 de cada R$1,00) + variacao em pp

### 3. Adicionar subtitulo "Mes Atual" em cada card

Abaixo do titulo de cada card (ex: "Receita"), adicionar:

```typescript
<p className="text-[10px] text-muted-foreground">Mes Atual</p>
```

### 4. Envolver cada Card com TooltipProvider/Tooltip

Cada um dos 4 cards sera envolvido com o componente Tooltip, exibindo o texto educativo ao passar o mouse:

```typescript
<TooltipProvider>
  <UITooltip>
    <TooltipTrigger asChild>
      <Card className="cursor-help">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Receita</p>
          <p className="text-[10px] text-muted-foreground">Mes Atual</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(comparativo.receita)}</p>
          <VariationBadge value={comparativo.varReceita} />
        </CardContent>
      </Card>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="max-w-xs text-sm">
      <p>{textoTooltipReceita}</p>
    </TooltipContent>
  </UITooltip>
</TooltipProvider>
```

### 5. Textos dinamicos dos tooltips

**Receita:**
- Base: "💰 Receita do mes atual. Todo o dinheiro que entrou no seu negocio neste mes."
- Variacao negativa: "📉 Voce faturou menos que no mes anterior. Pode indicar menos vendas ou menor ticket medio."
- Variacao positiva: "📈 Seu faturamento aumentou! Voce vendeu mais ou gerou mais receita neste periodo."

**Despesas:**
- Base: "💸 Despesas do mes atual. Todos os gastos do negocio (aluguel, funcionarios, insumos, etc.)."
- Aumento leve (0-15%): "🔹 Os gastos tiveram um leve crescimento."
- Aumento moderado (15-50%): "🔸 Os custos cresceram de forma perceptivel."
- Aumento elevado (50-100%): "🔴 Os gastos aumentaram significativamente."
- Aumento muito elevado (>100%): "🔥 Os gastos mais que dobraram!"
- Queda: "✅ Reducao de despesas melhora a rentabilidade."

**Lucro:**
- Base: "💰 Lucro do mes atual. Quanto realmente sobrou apos todas as despesas."
- Aumento: "📈 Seu negocio ficou mais lucrativo neste mes."
- Queda: "📉 O lucro caiu. Pode ser por queda de receita ou aumento de despesas."
- Negativo: "🚨 O negocio operou no prejuizo. As despesas superaram a receita."

**Margem:**
- Base: "📊 Margem de lucro. Mostra qual % do faturamento virou lucro."
- Exemplo: "💡 Ex: margem de 60% = a cada R$1,00, R$0,60 virou lucro."
- Aumento: "📈 Voce esta lucrando mais proporcionalmente."
- Queda: "📉 Mesmo faturando, uma parte menor virou lucro."
- Nota: "ℹ️ Variacao medida em pontos percentuais (pp)."

### Resumo

| Alteracao | Descricao |
|-----------|-----------|
| Subtitulo "Mes Atual" | Adicionado abaixo do titulo em cada um dos 4 cards |
| Tooltip Receita | Texto educativo dinamico baseado na variacao |
| Tooltip Despesas | Texto com 4 niveis de intensidade de aumento |
| Tooltip Lucro | Texto adaptado para lucro/prejuizo |
| Tooltip Margem | Texto com exemplo didatico e nota sobre pp |
| Import Tooltip | Importar componentes do Radix Tooltip |

Apenas o arquivo `src/components/relatorios/financeiros/GraficosFinanceiros.tsx` sera modificado.
