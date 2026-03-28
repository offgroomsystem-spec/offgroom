

## Plano: Reorganizar estrutura do DRE - unificar Custos e Despesas Operacionais

### Problema

O DRE atual separa "Custos Operacionais" (Produtos para Banho, Material de Limpeza) de "Despesas Operacionais" (demais subcategorias), criando duas secoes do mesmo tema. Num DRE padrao de pet shop, todas as deducoes operacionais devem estar agrupadas de forma coerente.

### Solucao

Reorganizar a estrutura para o padrao contabil correto:

```text
(+) Receita Operacional Bruta
    Servicos / Venda / Outras

(-) Deducoes e Custos Diretos
    Produtos para Banho
    Material de Limpeza

(=) Lucro Bruto
    Margem Bruta

(-) Despesas Operacionais          ← UNIFICADA (todas de "Despesa Operacional" exceto custos diretos)
    Combustivel / Contador / Freelancer / etc.

(-) Despesas Fixas
    Aluguel / Salarios / etc.

(=) Lucro Operacional
    Margem Operacional

(+/-) Resultado Nao Operacional
  (+) Receitas Nao Operacionais
  (-) Despesas Nao Operacionais

(=) LUCRO LIQUIDO DO EXERCICIO
    Margem Liquida
```

### Alteracoes

**Arquivo: `src/components/relatorios/financeiros/DRE.tsx`**

1. **Renomear secao "Custos Operacionais"** para **"(-) Deducoes e Custos Diretos"** (linhas 606-610) - deixa claro que sao custos de mercadoria/insumo direto, diferenciando-se das despesas operacionais administrativas.

2. **Manter "Despesas Operacionais"** como esta (linhas 620-622) - agora com o titulo da secao anterior diferente, nao ha mais confusao entre as duas.

3. **Mesma correcao no PDF** (linhas 303-308): renomear "(-) Custos Operacionais" para "(-) Deducoes e Custos Diretos".

### Tecnico

- Apenas renomear labels na renderizacao e no PDF. A logica de calculo permanece identica (custos diretos separados das despesas operacionais para calcular lucro bruto corretamente).
- 2 pontos de alteracao: renderizacao JSX (linha 607) e funcao `exportarPDF` (linha 304).

