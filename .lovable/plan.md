

# Correção do "Atualizar Saldo" no Fluxo de Caixa

## Problema Identificado

A função "Atualizar Saldo" calcula a diferença entre o novo saldo desejado e o **saldo total acumulado de todos os tempos**, em vez de calcular contra o **saldo acumulado até a data de referência selecionada**.

Isso significa que, por exemplo:
- Saldo calculado de Pag Seguro ate 01/02/2026: **-R$ 1.611,93**
- Saldo total de todos os tempos de Pag Seguro: **R$ 582,07**
- Quando o usuario digita R$ 582,07 como novo saldo para 01/02/2026, o sistema compara com o saldo total (582,07) e acha que nao ha diferenca
- O correto seria comparar com o saldo ate 01/02/2026 (-1.611,93), gerando um ajuste de R$ 2.194,00

Apos a correcao, o saldo em 01/02 passaria a ser R$ 582,07 e o Saldo Final em 02/02 seria calculado corretamente como R$ 601,59.

## Arquivo alterado

`src/components/relatorios/financeiros/FluxoDeCaixa.tsx`

## Correcao tecnica

Na funcao `handleConfirmarAtualizacao` (linha 1121-1124), substituir o calculo do `saldoAtualConta`:

**Codigo atual (errado):**
```typescript
const saldoAtualConta =
  saldosPorBanco.find((s) => s.nome === contaSelecionada)?.saldoAtual || conta.saldo;
const novoSaldoNumerico = parseFloat(novoSaldo);
const diferenca = novoSaldoNumerico - saldoAtualConta;
```

**Codigo corrigido:**
```typescript
// Calcular saldo acumulado ATE a data de referencia selecionada (inclusive)
const dataRef = format(dataAjusteSaldo, "yyyy-MM-dd");
const lancamentosConta = lancamentos.filter(
  (l) => l.nomeBanco === contaSelecionada && l.pago && l.dataPagamento <= dataRef
);
const receitasAteData = lancamentosConta
  .filter((l) => l.tipo === "Receita")
  .reduce((acc, l) => acc + l.valorTotal, 0);
const despesasAteData = lancamentosConta
  .filter((l) => l.tipo === "Despesa")
  .reduce((acc, l) => acc + l.valorTotal, 0);
const saldoAteData = receitasAteData - despesasAteData;

const novoSaldoNumerico = parseFloat(novoSaldo);
const diferenca = novoSaldoNumerico - saldoAteData;
```

Essa unica alteracao garante que o lancamento de ajuste criado tera o valor correto para equilibrar o saldo na data de referencia escolhida, e todos os calculos de Saldo Inicial / Saldo Final de periodos subsequentes ficarao corretos.

## Resultado esperado

Ao informar "Novo Saldo = R$ 582,07" com data de referencia 01/02/2026 para Pag Seguro:
- Sistema calcula saldo ate 01/02 = -R$ 1.611,93
- Diferenca = 582,07 - (-1.611,93) = R$ 2.194,00
- Cria lancamento de Receita de R$ 2.194,00 em 01/02/2026
- Saldo final 01/02: R$ 582,07
- Saldo final 02/02: R$ 601,59 (considerando movimentacoes do dia)

