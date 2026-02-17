
# Correcao: Recepcionista nao consegue criar agendamento

## Problema identificado

O erro "new row violates row-level security policy for table agendamentos" ocorre porque na criacao de agendamentos avulsos, o codigo usa `user.id` (ID da Erica/recepcionista) ao inves de `ownerId` (ID do proprietario/administrador).

A politica RLS exige que `user_id = get_effective_user_id(auth.uid())`, que para funcionarios retorna o `owner_id` da tabela `staff_accounts`. O insert esta gravando o ID da Erica (`a4bb1c63-...`), mas o RLS espera o ID do proprietario (`e368f8e7-...`).

**Comparacao**: O insert de agendamentos de pacotes (linha 1280) ja usa `ownerId` corretamente. Apenas o insert de agendamento avulso esta errado.

## Correcao

### Arquivo: `src/pages/Agendamentos.tsx`

**Linha 1044**: Alterar `user_id: user.id` para `user_id: ownerId`

```typescript
// ANTES (errado)
user_id: user.id,

// DEPOIS (correto)
user_id: ownerId,
```

Isso e suficiente para resolver o problema, pois o `ownerId` ja esta disponivel no componente (importado do `useAuth()` na linha 233) e ja e usado corretamente em todas as outras operacoes do mesmo arquivo (queries, inserts de pacotes, etc).
