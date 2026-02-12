

# Adicionar campo de Data ao "Atualizar Saldo Bancario"

## Resumo

Adicionar um campo de selecao de data (calendario) no dialog "Atualizar Saldo Bancario", logo abaixo do seletor de "Conta Bancaria". Quando o usuario selecionar uma data, o lancamento de ajuste usara essa data em vez da data atual. Por padrao, o campo vira preenchido com a data de hoje.

---

## Arquivo modificado: `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`

### 1. Novo estado para a data selecionada

Adicionar um estado `dataAjusteSaldo` do tipo `Date` inicializado com `new Date()` junto aos demais estados de saldo (linha ~398). Resetar esse estado no `abrirDialogoSaldo`.

### 2. Campo de calendario no dialog

Inserir um Popover com Calendar (padrao Shadcn DatePicker) entre o seletor de "Conta Bancaria" (linha 1135) e o bloco de "Saldo Atual" (linha 1137). O campo tera o label "Data de Referencia" e exibira a data selecionada no formato dd/MM/yyyy.

### 3. Ajustar logica de criacao do lancamento

Na funcao `handleConfirmarAtualizacao` (linha 1021-1023), substituir o uso de `new Date()` pela `dataAjusteSaldo`:
- `data_pagamento` usara a data selecionada formatada como `yyyy-MM-dd`
- `ano` e `mes_competencia` serao extraidos da data selecionada

### 4. Atualizar texto de confirmacao

No AlertDialog de confirmacao (linha ~2127), incluir a data selecionada na mensagem para que o usuario confirme a data do ajuste.

## Detalhes Tecnicos

| Aspecto | Detalhe |
|---------|---------|
| Arquivo | `src/components/relatorios/financeiros/FluxoDeCaixa.tsx` |
| Imports necessarios | `format` de `date-fns`, `Calendar`, `Popover/PopoverTrigger/PopoverContent`, `CalendarIcon` de lucide |
| Banco de dados | Nenhuma alteracao |
| Valor padrao | Data de hoje (`new Date()`) |
| Formato exibido | dd/MM/yyyy |
| Formato enviado ao banco | yyyy-MM-dd |

