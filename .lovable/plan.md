

## Melhorias na Central de Inteligência Financeira

### 1. Texto informativo abaixo do subtítulo
Adicionar o texto de aviso em vermelho logo abaixo de "Previsões, tendências e score de saúde do negócio" no componente `CentralInteligenciaFinanceira.tsx`.

### 2. Tooltip no card do Score
Envolver o card do Score com um `HoverCard` (já existe no projeto) que ao passar o mouse mostra uma janela explicando a lógica do cálculo:
- Crescimento (0-25 pts): baseado na taxa de crescimento dos últimos 30 dias vs 30 dias anteriores
- Estabilidade (0-25 pts): baseado na volatilidade do faturamento diário
- Atividade Recente (0-25 pts): baseado no faturamento dos últimos 30 dias vs média do período
- Base (0-25 pts): se há faturamento no período analisado

### 3. Correção da lógica do Score

**Problema identificado**: O score atual dá 25 pts para `scorePrevisao` se `mediaDiaria > 0` e 25 pts para `scoreBase` se `totalPeriodo > 0`. Com 90 dias de período e receita apenas nos primeiros 60 dias, ambos retornam 25 pts. Além disso, `volatilidade` é calculada apenas sobre dias COM lançamentos (ignora dias zerados), então a estabilidade também fica alta. Resultado: score ~50-75 mesmo com 30 dias sem faturamento.

**Correção em `useFinancialIntelligence.ts`**:

- **`scorePrevisao` → `scoreAtividadeRecente`**: Em vez de verificar apenas se `mediaDiaria > 0`, comparar `faturamento30d` com a média esperada. Se faturamento30d = 0, este componente = 0 pts. Fórmula: `min(faturamento30d / (mediaDiaria * 30), 1) * 25`
- **`scoreEstabilidade`**: Incluir dias zerados no cálculo de volatilidade (usar array completo do período, não só dias com lançamento), para que 30 dias sem receita aumente a volatilidade
- **Exportar componentes do score** para exibir no tooltip: adicionar `scoreDetalhes` ao retorno do hook com os 4 valores individuais

**Arquivo**: `src/hooks/useFinancialIntelligence.ts` — linhas 271-276 (score) e linha de volatilidade

**Arquivo**: `src/components/relatorios/financeiros/CentralInteligenciaFinanceira.tsx` — linhas 60-117 (header + score card)

