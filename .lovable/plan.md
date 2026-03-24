

## Plano: Toggle de WhatsApp por Cliente

### O que sera feito

Adicionar um campo `whatsapp_ativo` na tabela `clientes` e um toggle no formulario ao lado do titulo "Dados do Cliente" para ativar/desativar mensagens automaticas. A logica de envio no `whatsappScheduler` verificara esse campo antes de agendar mensagens.

### Alteracoes

**1. Migracao SQL** — Adicionar coluna `whatsapp_ativo`
- `ALTER TABLE clientes ADD COLUMN whatsapp_ativo boolean NOT NULL DEFAULT true;`
- Todos os clientes existentes ja terao `true` pelo default.

**2. `src/pages/Clientes.tsx`**
- Adicionar state `whatsappAtivo` (default `true`)
- No titulo "Dados do Cliente" (linha 357), adicionar um `Switch` ao lado com label "WhatsApp Ativo"
- No `handleSubmit`, salvar `whatsapp_ativo` junto com os demais campos
- No `handleEdit`, carregar o valor de `whatsapp_ativo` do cliente
- Na interface `Cliente`, adicionar `whatsapp_ativo: boolean`

**3. `src/utils/whatsappScheduler.ts`**
- Adicionar `clienteId?: string` ao `ScheduleParams`
- No inicio de `scheduleWhatsAppMessages`, buscar `whatsapp_ativo` do cliente na tabela `clientes` usando o nome ou ID
- Se `whatsapp_ativo === false`, retornar sem agendar nenhuma mensagem

**4. `supabase/functions/whatsapp-scheduler/index.ts`**
- Antes de enviar cada mensagem, verificar se o cliente tem `whatsapp_ativo = true` (consultar pelo nome do cliente no agendamento)
- Se `false`, marcar mensagem como `cancelado` e pular

### Resumo

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | Coluna `whatsapp_ativo boolean default true` |
| `Clientes.tsx` | Switch no formulario + persistencia |
| `whatsappScheduler.ts` | Checar flag antes de agendar |
| `whatsapp-scheduler/index.ts` | Checar flag antes de enviar |

