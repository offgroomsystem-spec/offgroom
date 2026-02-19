
## Diagnóstico

O problema está na função `handleExportarPDF` dentro de `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`.

Apesar de os cards na tela já usarem as variáveis dinâmicas corretas (`comparativoAnteriorCards`, `comparativoCards`, `labelCardAnterior`, `labelCardAtual`), a função de exportação PDF ainda referencia as variáveis **estáticas e antigas**:

- Linha 1409: `comparativoAnterior` → deveria ser `comparativoAnteriorCards`
- Linha 1434: `comparativo` → deveria ser `comparativoCards`
- Labels hardcoded: `"Mês Anterior"` / `"Mês Atual"` → deveriam ser `labelCardAnterior` / `labelCardAtual`

O CSV já está correto — ele usa `lancamentosFiltrados` via `dadosExportacao`, que já respeita os filtros aplicados.

---

## Correção

Apenas **1 arquivo** será alterado: `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`.

### Mudanças na função `handleExportarPDF` (linhas ~1409–1457):

**Bloco "Mês Anterior" no HTML do PDF:**
- Substituir `comparativoAnterior` por `comparativoAnteriorCards`
- Substituir o label `"Receita — Mês Anterior"` por `"Receita — " + labelCardAnterior`
- Substituir o label `"Despesas — Mês Anterior"` por `"Despesas — " + labelCardAnterior`
- Substituir o label `"Lucro — Mês Anterior"` por `"Lucro — " + labelCardAnterior`
- Substituir o label `"Margem — Mês Anterior"` por `"Margem — " + labelCardAnterior`

**Bloco "Mês Atual" no HTML do PDF:**
- Substituir `comparativo` por `comparativoCards`
- Substituir o label `"Receita — Mês Atual"` por `"Receita — " + labelCardAtual`
- Substituir o label `"Despesas — Mês Atual"` por `"Despesas — " + labelCardAtual`
- Substituir o label `"Lucro — Mês Atual"` por `"Lucro — " + labelCardAtual`
- Substituir o label `"Margem — Mês Atual"` por `"Margem — " + labelCardAtual`

### Resultado esperado

Quando o usuário aplicar o filtro de **Outubro/2025**, o PDF gerado exibirá:
- Cards linha 1: "Receita — Setembro/2025", "Despesas — Setembro/2025", etc. com valores calculados de Setembro
- Cards linha 2: "Receita — Outubro/2025", "Despesas — Outubro/2025", etc. com valores calculados de Outubro

Quando não houver filtro de competência específico, os labels voltam para "Mês Anterior" / "Mês Atual" com os dados estáticos do hook — exatamente igual ao comportamento atual dos cards na tela.

---

## Resumo

| Linha | Variável atual (errada) | Variável correta |
|-------|------------------------|-----------------|
| 1409 | `comparativoAnterior` | `comparativoAnteriorCards` |
| 1413–1429 | labels hardcoded "Mês Anterior" | `labelCardAnterior` dinâmico |
| 1434 | `comparativo` | `comparativoCards` |
| 1437–1454 | labels hardcoded "Mês Atual" | `labelCardAtual` dinâmico |
