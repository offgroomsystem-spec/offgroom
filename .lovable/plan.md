
# Ajuste dos Cards ao Filtro Aplicado no Fluxo de Caixa

## Diagnóstico da Situação Atual

Os cards de "Mês Anterior" e "Mês Atual" no Fluxo de Caixa são calculados **a partir do hook `useFinancialData`**, que sempre usa os dados dos últimos 12 meses do banco e retorna `comparativo` (mês atual do calendário) e `comparativoAnterior` (mês anterior ao atual do calendário). Esses valores não consideram os filtros do usuário.

O código atual, na linha 441, importa diretamente do hook:
```typescript
const { comparativo, dadosMensais } = useFinancialData();
```

E o `comparativoAnterior` (linha 1203) também é calculado com base no `dadosMensais` fixo do hook, sempre pegando os dois últimos meses do calendário.

## O que será alterado

Apenas **`src/components/relatorios/financeiros/FluxoDeCaixa.tsx`**.

---

## 3 Comportamentos a Implementar

### 1. Auto-preenchimento do Ano ao selecionar Mês da Competência

Quando o usuário escolher um mês no filtro "Mês da Competência" **e o campo Ano estiver vazio**, o sistema preencherá automaticamente o Ano com o ano atual. O usuário poderá alterar livremente depois.

Na linha 1778-1797, alterar o `onValueChange` do Select de Mês:
```typescript
onValueChange={(value) => {
  setFiltros({
    ...filtros,
    mes: value,
    dataInicio: "",
    dataFim: "",
    ano: filtros.ano || new Date().getFullYear().toString(), // <-- NOVO
  });
  setFiltroDataAtivo("mesano");
}}
```

---

### 2. Novo cálculo do `periodoReferencia` para os cards

Criar um `useMemo` chamado `periodoReferencia` que detecta qual mês/ano deve ser o "mês de referência" para os cards, com base em duas regras:

**Regra A — Filtro por Mês da Competência:**
- Se `filtroDataAtivo === "mesano"` e `filtros.mes` e `filtros.ano` estão preenchidos, o mês de referência é diretamente `filtros.mes`/`filtros.ano`.

**Regra B — Filtro por Período de Data de Pagamento:**
- Se `filtroDataAtivo === "periodo"` com `dataInicio` e `dataFim` preenchidos, detectar se o intervalo cobre o "mês completo" de uma competência.
- Considera "mês completo" quando `dataInicio` e `dataFim` estão no mesmo mês/ano.
- Para identificar o primeiro e último dia útil (segunda a sexta), usa a lógica de dias úteis já existente no projeto (`src/utils/diasUteis.ts`).
- Se `dataInicio <= primeiro dia do mês` e `dataFim >= último dia do mês`, é mês completo.
- Alternativamente, se `dataInicio >= primeiro dia útil do mês` e `dataFim <= último dia útil do mês` (contemplando o caso do usuário filtrar de 02/01 a 30/01), também é mês completo.
- Se o intervalo cobrir um mês completo, retorna esse mês como referência.

**Resultado do `periodoReferencia`:**
```typescript
interface PeriodoReferencia {
  mesRef: number;       // 1-12
  anoRef: number;       // ex: 2025
  mesLabel: string;     // ex: "outubro"
  anoLabel: string;     // ex: "2025"
}
```

---

### 3. Recalcular `comparativoCards` e `comparativoAnteriorCards` com base no `periodoReferencia`

Em vez de usar o `comparativo` e `comparativoAnterior` do hook (que são sempre mês atual/anterior do calendário), calcular os valores **diretamente dos `lancamentos`** já carregados na página, usando o `periodoReferencia`.

Criar dois `useMemo` novos:

**`comparativoCards`** (o mês de referência selecionado pelo usuário):
- Filtra `lancamentos` pelo mês/ano de referência + `pago === true`
- Calcula receitas, despesas, lucro, margem
- Para a variação (varReceita, varDespesa, varLucro, diffMargem), compara com o mês anterior ao de referência

**`comparativoAnteriorCards`** (mês imediatamente anterior ao de referência):
- Filtra `lancamentos` pelo mês anterior ao de referência
- Compara com dois meses antes (para calcular as variações do card anterior)

**Quando não há filtro aplicado** (`periodoReferencia === null`), os cards usam o comportamento atual (mês atual e anterior do calendário, como já funciona).

---

## Detalhamento Técnico do Cálculo

### Função auxiliar `calcularMetricasMes(mes, ano)`

```typescript
const calcularMetricasMes = (mes: number, ano: number) => {
  const mesStr = String(mes).padStart(2, "0");
  const anoStr = String(ano);
  const filtrados = lancamentos.filter(
    (l) => l.pago && l.ano === anoStr && l.mesCompetencia === mesStr
  );
  const receitas = filtrados.filter(l => l.tipo === "Receita").reduce((a, l) => a + l.valorTotal, 0);
  const despesas = filtrados.filter(l => l.tipo === "Despesa").reduce((a, l) => a + l.valorTotal, 0);
  const lucro = receitas - despesas;
  const margem = receitas > 0 ? (lucro / receitas) * 100 : 0;
  return { receitas, despesas, lucro, margem };
};
```

### `periodoReferencia` (novo useMemo)

```typescript
const periodoReferencia = useMemo(() => {
  if (!filtrosAplicados) return null;

  // Caso 1: filtro por Mês da Competência + Ano
  if (filtroDataAtivo === "mesano" && filtros.mes && filtros.ano) {
    return {
      mesRef: parseInt(filtros.mes),
      anoRef: parseInt(filtros.ano),
    };
  }

  // Caso 2: filtro por Período — detectar se cobre um mês completo
  if (filtroDataAtivo === "periodo" && filtros.dataInicio && filtros.dataFim) {
    const inicio = new Date(filtros.dataInicio + "T00:00:00");
    const fim = new Date(filtros.dataFim + "T00:00:00");

    // Devem estar no mesmo mês/ano
    if (inicio.getMonth() !== fim.getMonth() || inicio.getFullYear() !== fim.getFullYear()) {
      return null;
    }

    const mesRef = inicio.getMonth() + 1;
    const anoRef = inicio.getFullYear();

    const primeiroDia = new Date(anoRef, mesRef - 1, 1);
    const ultimoDia = new Date(anoRef, mesRef, 0);

    // Verificar se cobre o mês completo (do 1° ao último dia)
    const cobretudo = inicio <= primeiroDia && fim >= ultimoDia;

    // Verificar se cobre do primeiro ao último dia útil (seg-sex)
    let primeiroUtil = new Date(primeiroDia);
    while (primeiroUtil.getDay() === 0 || primeiroUtil.getDay() === 6) {
      primeiroUtil.setDate(primeiroUtil.getDate() + 1);
    }
    let ultimoUtil = new Date(ultimoDia);
    while (ultimoUtil.getDay() === 0 || ultimoUtil.getDay() === 6) {
      ultimoUtil.setDate(ultimoUtil.getDate() - 1);
    }
    const cobretudoUtil = inicio >= primeiroDia && inicio <= primeiroUtil && fim <= ultimoDia && fim >= ultimoUtil;

    if (cobretudo || cobretudoUtil) {
      return { mesRef, anoRef };
    }
  }

  return null;
}, [filtrosAplicados, filtroDataAtivo, filtros]);
```

### `comparativoCards` e `comparativoAnteriorCards` (novos useMemos)

```typescript
const comparativoCards = useMemo(() => {
  if (!periodoReferencia) return comparativo; // fallback para comportamento atual

  const { mesRef, anoRef } = periodoReferencia;
  const atual = calcularMetricasMes(mesRef, anoRef);

  // Calcular mês anterior para variação
  const mesAntNum = mesRef === 1 ? 12 : mesRef - 1;
  const anoAntNum = mesRef === 1 ? anoRef - 1 : anoRef;
  const ant = calcularMetricasMes(mesAntNum, anoAntNum);

  return {
    receita: atual.receitas,
    despesa: atual.despesas,
    lucro: atual.lucro,
    margem: atual.margem,
    varReceita: ant.receitas > 0 ? ((atual.receitas - ant.receitas) / ant.receitas) * 100 : 0,
    varDespesa: ant.despesas > 0 ? ((atual.despesas - ant.despesas) / ant.despesas) * 100 : 0,
    varLucro: ant.lucro !== 0 ? ((atual.lucro - ant.lucro) / Math.abs(ant.lucro)) * 100 : 0,
    diffMargem: atual.margem - ant.margem,
  };
}, [periodoReferencia, lancamentos, comparativo]);

const comparativoAnteriorCards = useMemo(() => {
  if (!periodoReferencia) return comparativoAnterior; // fallback

  const { mesRef, anoRef } = periodoReferencia;
  const mesAntNum = mesRef === 1 ? 12 : mesRef - 1;
  const anoAntNum = mesRef === 1 ? anoRef - 1 : anoRef;
  const ant = calcularMetricasMes(mesAntNum, anoAntNum);

  const mesDoisAtrasNum = mesAntNum === 1 ? 12 : mesAntNum - 1;
  const anoDoisAtrasNum = mesAntNum === 1 ? anoAntNum - 1 : anoAntNum;
  const doisAtras = calcularMetricasMes(mesDoisAtrasNum, anoDoisAtrasNum);

  return {
    receita: ant.receitas,
    despesa: ant.despesas,
    lucro: ant.lucro,
    margem: ant.margem,
    varReceita: doisAtras.receitas > 0 ? ((ant.receitas - doisAtras.receitas) / doisAtras.receitas) * 100 : 0,
    varDespesa: doisAtras.despesas > 0 ? ((ant.despesas - doisAtras.despesas) / doisAtras.despesas) * 100 : 0,
    varLucro: doisAtras.lucro !== 0 ? ((ant.lucro - doisAtras.lucro) / Math.abs(doisAtras.lucro)) * 100 : 0,
    diffMargem: ant.margem - doisAtras.margem,
  };
}, [periodoReferencia, lancamentos, comparativoAnterior]);
```

---

## Labels dos Cards

Os labels "Mês Anterior" e "Mês Atual" nos cards serão atualizados dinamicamente. Quando há `periodoReferencia`:
- Linha 1 (anterior): "Setembro/2025" (nome do mês anterior)
- Linha 2 (atual): "Outubro/2025" (nome do mês de referência)

Quando não há `periodoReferencia`, manter os labels atuais: "Mês Anterior" / "Mês Atual".

---

## Substituições no JSX (linhas 1499-1651)

- Substituir `{comparativoAnterior && ...}` por `{comparativoAnteriorCards && ...}`
- Substituir `{comparativo && ...}` por `{comparativoCards && ...}`
- Atualizar os textos dos cards com labels dinâmicos baseados em `periodoReferencia`

## Resumo das alterações

| Seção | Linha aprox. | Mudança |
|---|---|---|
| onValueChange Mês da Competência | 1780 | Auto-preencher Ano quando vazio |
| Novo useMemo `periodoReferencia` | após linha 1221 | Detecta período de referência |
| Novo `calcularMetricasMes` | após linha 1221 | Função auxiliar de cálculo |
| Novo `comparativoCards` | após linha 1221 | Substitui `comparativo` nos cards |
| Novo `comparativoAnteriorCards` | após linha 1221 | Substitui `comparativoAnterior` |
| Labels cards JSX | 1499-1651 | Labels dinâmicos com mês/ano real |
