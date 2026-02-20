

# Plano: Transferencia de Saldo entre Contas no Fluxo de Caixa

## Resumo

Remover o botao "Exportar CSV" e adicionar um novo botao "Transferencia de Saldo" na barra de acoes do Fluxo de Caixa. Ao clicar, abre um modal completo para transferir valores entre contas bancarias cadastradas.

## Alteracoes

Arquivo unico: `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`

### 1. Remover botao "Exportar CSV"

- Remover o botao "Exportar CSV" (linhas 1626-1630) e o wrapper `div` ao redor dele e do "Exportar PDF"
- Manter o botao "Exportar PDF" na mesma linha dos demais botoes
- A funcao `exportCSV` e o `dadosExportacao` podem permanecer no codigo (sem impacto), ou serem removidos para limpeza

### 2. Adicionar botao "Transferencia de Saldo"

- Posicionar imediatamente a esquerda do botao "Mostrar Filtros"
- Mesmo padrao visual: `variant="outline"`, `className="h-8 text-xs gap-2"`, com icone `ArrowLeftRight` do lucide-react
- Ordem final dos botoes: **Transferencia de Saldo** | **Mostrar Filtros** | **Atualizar Saldo** | **Exportar PDF**

### 3. Novos estados

```
const [dialogTransferenciaOpen, setDialogTransferenciaOpen] = useState(false);
const [contaOrigem, setContaOrigem] = useState("");
const [contaDestino, setContaDestino] = useState("");
const [valorTransferencia, setValorTransferencia] = useState("");
const [dataTransferencia, setDataTransferencia] = useState<Date>(new Date());
const [confirmTransferenciaOpen, setConfirmTransferenciaOpen] = useState(false);
```

### 4. Modal de Transferencia

Ao clicar no botao, abre um `Dialog` com:

**Topo - Lista de contas com saldos:**
- Exibir cada conta bancaria com seu saldo atual calculado ate a data atual no formato:
  `NomeBanco -- Saldo disponivel: R$ X.XXX,XX`
- Usa os dados de `saldosPorBanco`

**Campos do formulario:**
1. **Conta que ira transferir** (Select com selecao unica) - lista as contas
2. **Conta que ira receber** (Select com selecao unica) - lista as contas, excluindo a conta selecionada em "origem"
3. **Valor da transferencia** (Input texto com formatacao em moeda brasileira R$, aceita apenas numeros positivos)
4. **Data da transferencia** (DatePicker com calendario, padrao = data atual)
5. Botoes: **Confirmar Transferencia** e **Cancelar**

**Validacoes ao clicar "Confirmar Transferencia":**
- Campos obrigatorios preenchidos
- Contas origem e destino diferentes
- Valor positivo
- Calcular saldo da conta de origem ate a data selecionada (mesma logica usada no Atualizar Saldo)
- Se saldo insuficiente: exibir toast de erro "Saldo insuficiente da conta 'X' para a data selecionada, revise o valor ou selecione outra conta."

### 5. Resumo e confirmacao

Apos validacao, abrir `AlertDialog` com resumo:
- Conta de origem: NomeBanco
- Conta de destino: NomeBanco
- Valor: R$ X.XXX,XX
- Data: DD/MM/YYYY
- Botoes: Confirmar / Cancelar

### 6. Logica de persistencia (ao confirmar)

Criar **2 lancamentos financeiros** no banco:

1. **Despesa na conta de origem:**
   - tipo: "Despesa"
   - descricao1: "Despesa Nao Operacional"
   - valor_total: valorTransferencia
   - data_pagamento: dataTransferencia
   - conta_id: conta origem
   - pago: true
   - observacao: "Transferencia entre contas"
   - Item: descricao2 = "Outras Despesas Nao Operacionais", produto_servico = "Transferencia entre contas"

2. **Receita na conta de destino:**
   - tipo: "Receita"
   - descricao1: "Receita Nao Operacional"
   - valor_total: valorTransferencia
   - data_pagamento: dataTransferencia
   - conta_id: conta destino
   - pago: true
   - observacao: "Transferencia entre contas"
   - Item: descricao2 = "Outras Receitas Nao Operacionais", produto_servico = "Transferencia entre contas"

Apos sucesso: exibir toast de sucesso, fechar modais, recarregar lancamentos (`loadLancamentos()` e `loadRelatedData()`).

### 7. Formatacao do campo de valor

- Ao digitar, aceitar apenas numeros
- Formatar exibicao como moeda brasileira (R$ X.XXX,XX)
- Armazenar internamente o valor numerico para calculos

## Resultado esperado

O usuario podera transferir saldo entre contas de forma simples, com validacao de saldo na data, confirmacao visual e registro automatico no fluxo de caixa como "Transferencia entre contas". Os saldos serao atualizados imediatamente apos a operacao.

