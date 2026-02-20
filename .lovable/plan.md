

# Plano: Saldos dinamicos por data no modal de Transferencia

## Resumo

Atualizar o card "Saldos disponiveis" dentro do modal de transferencia para que ele recalcule os saldos de cada conta com base na data selecionada no campo "Data da transferencia", em vez de sempre mostrar o saldo atual. Tambem garantir que a validacao impeca que a conta de origem fique negativa (pode zerar, mas nao negativar).

## Alteracoes

Arquivo unico: `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`

### 1. Calcular saldos por data no modal

Adicionar um `useMemo` (ou calculo inline) que recalcula os saldos de cada conta ate a `dataTransferencia` selecionada:

```typescript
const saldosPorBancoNaData = useMemo(() => {
  const dataRef = format(dataTransferencia, "yyyy-MM-dd");
  return contas.map((conta) => {
    const lancamentosConta = lancamentos.filter(
      (l) => l.nomeBanco === conta.nomeBanco && l.pago && l.dataPagamento <= dataRef
    );
    const receitas = lancamentosConta
      .filter((l) => l.tipo === "Receita")
      .reduce((acc, l) => acc + l.valorTotal, 0);
    const despesas = lancamentosConta
      .filter((l) => l.tipo === "Despesa")
      .reduce((acc, l) => acc + l.valorTotal, 0);
    return { nome: conta.nomeBanco, saldo: receitas - despesas };
  });
}, [dataTransferencia, contas, lancamentos]);
```

### 2. Atualizar o card de saldos no modal

Substituir o uso de `saldosPorBanco` pelo novo `saldosPorBancoNaData` e atualizar o titulo para refletir a data selecionada:

- Titulo: `Saldos disponíveis (DD/MM/YYYY)` mostrando a data selecionada
- Valores: calculados ate a data selecionada
- Ao mudar a data no calendario, o card atualiza automaticamente

### 3. Ajustar validacao para permitir zerar mas nao negativar

Na funcao `validarTransferencia`, alterar a comparacao de `valor > saldoAteData` para `valor > saldoAteData` (ja esta correto, pois permite valor igual ao saldo, zerando a conta). Confirmar que a logica atual ja impede negativacao mas permite zerar.

Revisando o codigo atual: `if (valor > saldoAteData)` -- isso ja esta correto. Se valor == saldo, passa. Se valor > saldo, bloqueia. Nenhuma alteracao necessaria na validacao.

## Resultado esperado

- Ao abrir o modal, os saldos mostram valores calculados ate a data atual (padrao)
- Ao selecionar outra data no calendario, o card "Saldos disponiveis" atualiza instantaneamente com os saldos de cada conta ate aquela data
- O usuario pode transferir ate o valor total do saldo (zerando a conta), mas nao pode ultrapassar
