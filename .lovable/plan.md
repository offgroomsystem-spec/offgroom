

## Renomear "Formas de Pagamento" → "Condição de Pagamento" em ComprasRealizadas.tsx

O código já usa "Condição de Pagamento" nos textos visíveis (labels, títulos do modal, toasts), mas os **nomes de variáveis internas** ainda seguem o padrão antigo `formasPagamento`. As mudanças são puramente de renomeação interna:

### Alterações em `src/pages/ComprasRealizadas.tsx`

| De | Para |
|---|---|
| `formasPagamentoOpen` | `condicaoPagamentoOpen` |
| `setFormasPagamentoOpen` | `setCondicaoPagamentoOpen` |
| `prazosPagamento` | `prazosCondicao` |
| `setPrazosPagamento` | `setPrazosCondicao` |
| `opcoesDiasPagamento` | `opcoesCondicaoPagamento` |

Todas as ~20 referências a esses nomes serão atualizadas. Nenhuma alteração de lógica, apenas renomeação consistente.

**Nota:** O arquivo `Fornecedores.tsx` mantém `forma_pagamento` e `FORMAS_PAGAMENTO` pois lá se refere ao **método** de pagamento (Pix, Boleto, etc.), que é um conceito diferente de "condição de pagamento" (prazos). Não será alterado.

