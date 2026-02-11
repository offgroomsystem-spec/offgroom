

# Exibir Saldo Inicial e Saldo Final no Fluxo de Caixa (quando filtro de data aplicado)

## Resumo

Adicionar dois novos valores ao card de "Saldos por Banco": **Saldo Inicial** (soma de todos os lancamentos pagos ANTES do periodo filtrado) e **Saldo Final** (Saldo Inicial + receitas - despesas dentro do periodo filtrado). Esses valores so aparecem quando ha filtro de data ativo. Os saldos atuais das contas continuam exibidos normalmente.

---

## Arquivo modificado: `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`

### 1. Detectar se ha filtro de data ativo

Criar um `useMemo` que verifica se o usuario aplicou filtro de data (periodo com dataInicio/dataFim ou mes/ano) e retorna as datas limites do periodo filtrado em formato `yyyy-MM-dd`.

### 2. Calcular Saldo Inicial e Saldo Final por banco

Novo `useMemo` que, para cada conta bancaria:
- **Saldo Inicial**: soma receitas pagas - despesas pagas de TODOS os lancamentos com `dataPagamento` anterior ao inicio do periodo filtrado
- **Saldo Final**: Saldo Inicial + receitas pagas no periodo - despesas pagas no periodo
- Tambem calcular totais gerais (Saldo Inicial Total e Saldo Final Total)

### 3. Exibir no card de Saldos por Banco

Quando filtro de data estiver ativo e aplicado:
- Adicionar acima da listagem atual um bloco mostrando "Saldo Inicial do Periodo" e "Saldo Final do Periodo" com seus respectivos totais
- Os saldos atuais por banco continuam exibidos normalmente abaixo, sem alteracao

### 4. Layout do card expandido

```text
+--------------------------------------------+
| Saldos por Banco                           |
|--------------------------------------------|
| >> Saldo Inicial do Periodo (dd/mm/yyyy):  |
|    Pag Seguro:              R$ XX.XXX,XX   |
|    Saldo Inicial Total:     R$ XX.XXX,XX   |
|--------------------------------------------|
| >> Saldo Final do Periodo (dd/mm/yyyy):    |
|    Pag Seguro:              R$ XX.XXX,XX   |
|    Saldo Final Total:       R$ XX.XXX,XX   |
|--------------------------------------------|
| >> Saldo Atual (sempre visivel):           |
|    Pag Seguro:              R$ XX.XXX,XX   |
|    Saldo Total:             R$ XX.XXX,XX   |
+--------------------------------------------+
```

## Detalhes Tecnicos

| Aspecto | Detalhe |
|---------|---------|
| Arquivo | `src/components/relatorios/financeiros/FluxoDeCaixa.tsx` |
| Banco de dados | Nenhuma alteracao |
| Logica de calculo | Saldo Inicial = receitas pagas antes do periodo - despesas pagas antes do periodo; Saldo Final = Saldo Inicial + movimentacao do periodo |
| Condicao de exibicao | `filtrosAplicados && filtroDataAtivo !== null` (somente quando ha filtro de data) |
| Para filtro mes/ano | Inicio = primeiro dia do mes, fim = ultimo dia do mes |

