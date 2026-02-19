
## Bug: Taxi Dog não é salvo na edição de agendamento de Pacote

### Diagnóstico

O problema está na função `handleAtualizarAgendamento` em `src/pages/Agendamentos.tsx` (linhas 1873–1881).

Quando o usuário edita um agendamento do tipo **Pacote**, a atualização é enviada para a tabela `agendamentos_pacotes`. Porém, o campo `taxi_dog` **não está incluído** no payload do `.update()`:

```typescript
// Código atual — falta taxi_dog
.update({
  servicos: updatedServicos as any,
  whatsapp: editandoAgendamento.whatsapp,
  data_venda: editandoAgendamento.dataVenda,
  updated_at: new Date().toISOString(),
  // ❌ taxi_dog ausente
})
```

O formulário de edição captura corretamente a mudança do campo "Taxi Dog" (o estado `editandoAgendamento.taxiDog` é atualizado via `setEditandoAgendamento`), mas esse valor nunca é enviado ao banco ao salvar. Por isso a alteração some após recarregar.

---

### Comportamento esperado

Como o campo `taxi_dog` pertence ao registro pai na tabela `agendamentos_pacotes` (e todos os serviços do pacote compartilham o mesmo valor), **alterar o Taxi Dog em qualquer serviço do pacote atualizará automaticamente todos os agendamentos daquele pacote** — pois é um campo único na tabela pai.

---

### Correção

Apenas **1 arquivo** será alterado: `src/pages/Agendamentos.tsx`.

Adicionar `taxi_dog: editandoAgendamento.taxiDog` no payload do `.update()` da linha ~1876:

```typescript
// Código corrigido
.update({
  servicos: updatedServicos as any,
  whatsapp: editandoAgendamento.whatsapp,
  data_venda: editandoAgendamento.dataVenda,
  taxi_dog: editandoAgendamento.taxiDog,  // ✅ adicionado
  updated_at: new Date().toISOString(),
})
```

### Resumo

| Arquivo | Linha | Mudança |
|---|---|---|
| `src/pages/Agendamentos.tsx` | 1876 | Adicionar `taxi_dog: editandoAgendamento.taxiDog` no payload do update de pacote |

Uma linha adicionada resolve o problema completamente.
