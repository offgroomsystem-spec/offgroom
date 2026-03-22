

## Permitir transferência com saldo insuficiente (com alerta de confirmação)

### O que será feito

Remover a trava que bloqueia transferências quando o valor excede o saldo da conta de origem. Em vez de bloquear, exibir um AlertDialog de alerta informando o saldo resultante negativo, com opções "Sim" (prossegue) e "Não" (cancela).

### Alterações — `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`

**1. Novo estado** para controlar o alerta de saldo insuficiente:
- `alertaSaldoInsuficiente` (boolean)
- `saldoResultanteOrigem` (number) — saldo que ficará após a transferência

**2. Função `validarTransferencia` (~linha 1060-1063)**: Remover o `if (valor > saldoAteData)` que retorna `false`. Em vez disso, guardar o `saldoAteData` para uso posterior.

**3. Função `abrirConfirmacaoTransferencia` (~linha 1068-1072)**: Após validação básica, calcular o saldo resultante (`saldoAteData - valor`). Se negativo, abrir o AlertDialog de alerta em vez do de confirmação padrão. Se positivo, seguir o fluxo normal.

**4. Novo AlertDialog no JSX** (após o AlertDialog de confirmação existente):
- Título: "Atenção"
- Mensagem: "Atenção: ao transferir o valor de R$ X,XX, o saldo da conta [Nome] na data da transferência ficará em R$ X,XX. Deseja realmente prosseguir com essa operação?"
- Botão "Sim" → fecha alerta, abre confirmação padrão (ou executa direto a transferência)
- Botão "Não" → fecha alerta e fecha o dialog de transferência

