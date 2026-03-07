

## Central de Inteligência Financeira

Novo módulo analítico de BI dentro da aba "Relatórios Financeiros", acessível como um card na lista de relatórios financeiros existente.

### Arquitetura

1. **Novo componente**: `src/components/relatorios/financeiros/CentralInteligenciaFinanceira.tsx` (~800-1000 linhas)
2. **Novo hook**: `src/hooks/useFinancialIntelligence.ts` — encapsula toda a lógica de busca, cálculo das 4 camadas, previsões, cenários, insights e score
3. **Integração**: Adicionar card + rota no `src/pages/Relatorios.tsx`

### Hook `useFinancialIntelligence`

- Busca `lancamentos_financeiros` com `pago = true` e `descricao1 = 'Receita Operacional'`
- Aceita parâmetro `periodoDias` (30/60/90/120/180, default 90)
- Calcula e retorna:
  - **Camada 1**: média diária, semanal, mensal estimada
  - **Camada 2**: taxa de crescimento (divide período em 3 terços de 30 dias)
  - **Camada 3**: sazonalidade por semana do mês (5 faixas) e por dia da semana (seg-sáb)
  - **Camada 4**: volatilidade (desvio padrão / média) → classificação estável/crescimento/volátil
  - **Previsões curto prazo**: 7, 10, 15, 20 dias × 3 cenários (conservador -10%, realista, otimista +10%)
  - **Previsões médio prazo**: 30, 60, 90, 120 dias × 3 cenários
  - **Insights automáticos**: array de strings gerados por regras (crescimento, sazonalidade, comportamento, previsão)
  - **Alertas**: queda de faturamento, desaceleração, tendência de baixa
  - **Score de saúde**: 0-100 baseado em crescimento + estabilidade + previsões + volatilidade → cor (vermelho/amarelo/verde/azul)
  - **Dados para gráficos**: faturamento diário, receita por dia da semana, receita por semana do mês, projeção cenários

### Componente `CentralInteligenciaFinanceira`

Layout BI moderno com seções:

1. **Header** com título + seletor de período (30/60/90/120/180 dias)
2. **Score de Saúde** — card circular grande com gauge visual (0-100) e cor
3. **KPIs principais** — grid 4 cols: faturamento 30d, 60d, 90d, média diária, média semanal, taxa crescimento, tendência
4. **Alertas inteligentes** — AlertCards condicionais (só aparecem se detectados)
5. **Previsões curto prazo** — grid de cards com 7/10/15/20 dias mostrando 3 cenários cada
6. **Previsões médio prazo** — grid de cards com 30/60/90/120 dias mostrando 3 cenários cada
7. **Gráfico 1** — LineChart evolução faturamento diário (últimos N dias)
8. **Gráfico 2** — BarChart receita por dia da semana
9. **Gráfico 3** — BarChart receita por semana do mês
10. **Gráfico 4** — LineChart projeção 3 cenários sobrepostos
11. **Insights automáticos** — lista de cards com ícones e texto interpretativo

Usa recharts (já instalado), KPICard e AlertCard existentes, e componentes ui/ do projeto.

### Alterações em `Relatorios.tsx`

- Adicionar card `{ id: "central-inteligencia", titulo: "🧠 Central de Inteligência Financeira", desc: "Previsões, tendências e score de saúde do negócio" }` no array de relatórios financeiros (linha 188)
- Adicionar `{relatorioAtivo === "central-inteligencia" && <CentralInteligenciaFinanceira />}` na seção de renderização (linha ~85)
- Adicionar `"central-inteligencia"` no array de relatórios conhecidos (linha ~100)

### Fórmulas-chave

```text
Média diária = totalReceita / diasAnalisados
Taxa crescimento = (terço3 - terço2) / terço2
Volatilidade = desvioParão(faturamentoDiário) / médiaDiária
Score = 25*(crescimento) + 25*(estabilidade) + 25*(previsão) + 25*(1-volatilidade)
Previsão = médiaDiária × dias × (1 + taxaCrescimento) × ajusteSazonalidade
  Conservador: × 0.90
  Otimista: × 1.10
```

### Dados

Não requer alterações no banco de dados. Usa apenas a tabela `lancamentos_financeiros` existente com filtro `pago = true` e `descricao1 = 'Receita Operacional'`.

