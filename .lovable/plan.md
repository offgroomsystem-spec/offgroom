

## Melhorias no Modal "Formas de Pagamento"

### 1. Listar formas de pagamento já cadastradas (com exclusão)

Logo abaixo do título "Formas de Pagamento", adicionar uma seção que exibe todas as formas já salvas no banco (`prazosPagamento` carregados do DB). Cada item mostra o valor em dias e um botão vermelho com "X" ao lado.

- Ao clicar no "X", abre um `AlertDialog` de confirmação: "Tem certeza que gostaria de excluir essa condição de pagamento?"
- Botões "Sim" / "Não"
- **Sim**: exclui do banco (`DELETE FROM formas_pagamento WHERE user_id = ownerId AND dias = X`), recarrega a lista, e fecha o modal inteiro
- **Não**: fecha apenas o AlertDialog, modal permanece aberto

Novo state: `prazoExcluir` (string | null) para controlar qual prazo está sendo confirmado para exclusão.

### 2. Validação de duplicidade ao salvar

Antes de salvar, verificar se o novo valor já existe na lista `prazosPagamento`. Se existir, exibir `toast.error("Essa condição de pagamento já existe!")` e impedir o salvamento.

A verificação será feita no handler do botão "Salvar": converter todos os prazos para números e checar se há duplicatas com `new Set()`.

### Arquivo alterado
- `src/pages/ComprasRealizadas.tsx` — linhas ~1178-1254 (modal Formas de Pagamento) + novo state

