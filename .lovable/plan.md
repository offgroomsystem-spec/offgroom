

## Corrigir Campo de Horário nos Pacotes do Scheduler

### Problema

A função `autoCreatePacoteMessages` na edge function `whatsapp-scheduler` usa `sv.horario` para acessar o horário dos serviços de pacote, mas o campo correto nos dados é `horarioInicio`. Isso faz com que a condição `!sv.horario` na linha 474 seja sempre `true`, pulando **todos** os serviços de pacote — incluindo Carol Gontijo.

Da mesma forma, `sv.servico || sv.nome` (linha 489) não encontra o nome do serviço porque o campo correto é `nomeServico`.

### Correções — Arquivo: `supabase/functions/whatsapp-scheduler/index.ts`

**Linha 474**: Trocar `sv.horario` por `sv.horarioInicio`
```
if (!sv.data || !sv.horarioInicio) continue;
```

**Linha 478**: Trocar `sv.horario` por `sv.horarioInicio`
```
const agDateTime = parseDateTimeBRT(sv.data, sv.horarioInicio);
```

**Linha 489**: Trocar `sv.servico || sv.nome` por `sv.nomeServico`
```
const servicoNome = sv.nomeServico || sv.servico || sv.nome || "Banho";
```

**Linha 492**: Trocar `sv.horario` por `sv.horarioInicio` na chamada de `buildConfirmationMessage`

**Linha 534**: Trocar `sv.horario` por `sv.horarioInicio` na chamada de `buildReminderMessage`

**Linha 541**: Trocar `sv.horario` por `sv.horarioInicio` na chamada de `buildReminderMessage`

### Resultado

Após o deploy, o scheduler vai criar automaticamente mensagens para todos os pacotes (Carol Gontijo, Daniel Alves, Moacir, Daniela, etc.) e enviá-las conforme as regras de temporização.

