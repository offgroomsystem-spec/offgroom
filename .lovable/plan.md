

## Corrigir Envio Automático de Mensagens WhatsApp

### Problema Principal

O envio automático não funciona porque a flag `evolution_auto_send` na tabela `empresa_config` é `false` para todos os usuários. A edge function `whatsapp-scheduler` verifica essa flag e pula todos os envios quando é `false`. Nenhum código no sistema define essa flag como `true` — nem ao conectar o WhatsApp, nem em qualquer toggle na UI.

### Solução

**1. Ativar `evolution_auto_send` automaticamente ao conectar WhatsApp**

**Arquivo: `src/components/empresa/WhatsAppIntegration.tsx`**

Na função `updateInstanceStatus`, quando o status muda para `"connected"`, atualizar `empresa_config` setando `evolution_auto_send = true`. Quando mudar para `"disconnected"`, setar `evolution_auto_send = false`.

```typescript
// Ao atualizar status para "connected":
await supabase
  .from("empresa_config")
  .update({ evolution_auto_send: true })
  .eq("user_id", effectiveUserId);

// Ao atualizar status para "disconnected":
await supabase
  .from("empresa_config")
  .update({ evolution_auto_send: false })
  .eq("user_id", effectiveUserId);
```

**2. Mesma lógica no Agendamentos.tsx**

Na verificação live de status que já existe no `loadRelatedData`, quando o status é atualizado no banco, também atualizar `evolution_auto_send` na `empresa_config`.

**3. Corrigir timezone no `whatsappScheduler.ts`**

A função `parseDateTime` usa `new Date(year, month-1, day, hours, minutes)` que cria datas no timezone local do navegador. Como o `agendado_para` é armazenado como ISO/UTC, as 7h podem estar sendo gravadas como 7h UTC (que é 4h no horário de Brasília). Ajustar para usar o fuso de Brasília (UTC-3):

```typescript
function parseDateTime(date: string, time: string): Date {
  // Criar data em UTC-3 (Brasília)
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day, hours + 3, minutes, 0, 0));
  return dt;
}
```

E ajustar a lógica de "agendar para 7h" para também usar UTC-3:
```typescript
// 7h Brasília = 10h UTC
agendadoPara.setUTCHours(10, 0, 0, 0);
```

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/empresa/WhatsAppIntegration.tsx` | Setar `evolution_auto_send` ao mudar status |
| `src/pages/Agendamentos.tsx` | Setar `evolution_auto_send` ao verificar status live |
| `src/utils/whatsappScheduler.ts` | Corrigir timezone para Brasília (UTC-3) |

### Resultado esperado

- Ao conectar o WhatsApp, `evolution_auto_send` será `true` automaticamente
- O cron job (`whatsapp-scheduler`) vai encontrar o usuário como ativo e processar as mensagens pendentes
- As mensagens das 7h serão agendadas corretamente no fuso de Brasília

