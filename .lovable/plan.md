
# Melhorias no Relatório de Fluxo de Caixa

## O que será feito

Duas melhorias principais no arquivo `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`:

1. **Substituir os cards atuais** (Recebido, A Receber, Pago, A Pagar) pelos cards de Receita/Despesas/Lucro/Margem em duas linhas (Mês Anterior e Mês Atual), igual aos cards da página "Gráficos Financeiros".

2. **Implementar o botão "Exportar PDF"** com geração de PDF em orientação horizontal (landscape), incluindo todos os cards e a tabela de lançamentos, sendo bloqueado com mensagem de aviso quando não há filtro ativo.

---

## Detalhamento Técnico

### 1. Novos Cards (substituindo os 4 cards atuais)

Os cards atuais na linha ~1279 serão removidos e substituídos por dois blocos de cards importados do hook `useFinancialData`, que já existe no projeto e fornece `comparativo` (mês atual) e `comparativoAnterior` (mês anterior) com os campos: `receita`, `despesa`, `lucro`, `margem` e suas variações.

**Linha 1° - Mês Anterior** (4 cards: Receita, Despesas, Lucro, Margem):
- Mesmo visual dos cards de `GraficosFinanceiros.tsx`
- Badge de variação percentual com seta de tendência
- Tooltip informativo (reutilizar a lógica `getTooltipText`)

**Linha 2° - Mês Atual** (4 cards: Receita, Despesas, Lucro, Margem):
- Mesmo visual

O `useFinancialData` já é importado em outros locais do projeto, bastando adicioná-lo ao topo do `FluxoDeCaixa.tsx`.

### 2. Exportar PDF com orientação horizontal

**Lógica de bloqueio:**
- A variável `filtrosAplicados` (já existente no estado) determina se há filtro ativo.
- Se `filtrosAplicados === false`, o clique no botão PDF exibe um `toast.error` com a mensagem: _"Favor selecionar no filtro o período que deseja extrair no relatório."_

**Geração do PDF via `window.print()`:**
A abordagem mais compatível e sem dependências extras é usar CSS de impressão com `@media print`. Ao clicar em "Exportar PDF":

1. Cria um elemento HTML temporário com:
   - Os cards de mês anterior e atual renderizados em formato tabular
   - A tabela de lançamentos filtrados
   - Estilo CSS interno com `@page { size: A4 landscape; margin: 10mm; }`
2. Abre uma nova janela (`window.open`), escreve o HTML e chama `window.print()`

Isso evita a necessidade de instalar bibliotecas como `jspdf` ou `html2canvas` (que podem ser instáveis para tabelas grandes) e garante que o PDF contenha todos os dados filtrados com layout adequado.

**Conteúdo do PDF:**
- Título: "Fluxo de Caixa - [período filtrado]"
- Linha 1: Cards Mês Anterior (Receita | Despesas | Lucro | Margem)
- Linha 2: Cards Mês Atual (Receita | Despesas | Lucro | Margem)
- Tabela completa de lançamentos filtrados com todas as colunas

### 3. Alterações no ExportButton e layout do header

O botão "Exportar PDF" atual no `ExportButton` mostra um `toast` de "em desenvolvimento". A lógica do PDF será implementada diretamente no `FluxoDeCaixa.tsx` substituindo o componente `ExportButton` por botões individuais inline, onde:
- O botão "Exportar CSV" mantém o comportamento atual
- O botão "Exportar PDF" recebe a nova lógica descrita acima

### 4. Arquivo alterado

Apenas **`src/components/relatorios/financeiros/FluxoDeCaixa.tsx`**:
- Adicionar import de `useFinancialData` e `formatCurrency` do hook
- Adicionar import de `Tooltip/TooltipProvider/TooltipTrigger/TooltipContent` do radix
- Adicionar import de `TrendingDown, Minus` (já existem parcialmente)
- Remover bloco dos 4 cards antigos (linhas ~1279-1337)
- Adicionar os 8 novos cards em dois grupos de 4
- Substituir `ExportButton` por botões inline com nova lógica de PDF
- Adicionar função `handleExportarPDF` com geração do documento HTML e `window.print()`
