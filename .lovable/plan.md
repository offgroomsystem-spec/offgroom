

## Ajuste: Condições de Pagamento Compostas (ex: "30/60")

### Problema

A tabela `formas_pagamento` armazena `dias` como `integer`, o que impede condições compostas como "30/60" ou "30/60/90". A validação de duplicidade compara números individuais, fazendo "30" e "30/60" conflitarem incorretamente.

### Solução

**1. Migração SQL** — Alterar a coluna `dias` de `integer` para `text`:
```sql
ALTER TABLE public.formas_pagamento ALTER COLUMN dias TYPE text USING dias::text;
```

**2. Alterações em `src/pages/ComprasRealizadas.tsx`:**

- **Input**: Trocar `type="number"` por `type="text"` e atualizar o placeholder para `"Ex: 30 ou 30/60"`. Permitir apenas dígitos e `/` no `onKeyDown`.
- **`salvarFormasPagamento`**: A duplicidade passa a comparar as strings completas (ex: `"30"` vs `"30/60"` são diferentes). Normalizar removendo espaços.
- **`loadFormasPagamento`**: Já retorna strings, não precisa de `parseInt`.
- **Exibição na lista**: Mostrar `"30 dias"` para simples e `"30/60 dias"` para compostas.
- **`excluirFormaPagamento`**: Comparar por texto em vez de `parseInt`.

### Resumo das mudanças
- 1 migração SQL (alterar tipo da coluna)
- Edições no modal de Formas de Pagamento (input, validação, exibição)

