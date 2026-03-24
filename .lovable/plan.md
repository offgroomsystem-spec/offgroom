

## Plano: Toggle WhatsApp por Pet

### O que sera feito

Adicionar coluna `whatsapp_ativo` na tabela `pets` e um toggle ao lado de cada "Pet #N" no formulario. Implementar logica de cascata entre o toggle do cliente e dos pets.

### Regras de cascata

- Cliente desativado → todos os pets desativados automaticamente
- Cliente com 1 pet e pet desativado → cliente tambem desativado
- Cliente com 2+ pets e apenas 1 pet desativado → somente aquele pet suspendido, cliente permanece ativo

### Alteracoes

**1. Migracao SQL**
- `ALTER TABLE public.pets ADD COLUMN whatsapp_ativo boolean NOT NULL DEFAULT true;`

**2. `src/pages/Clientes.tsx`**

- Adicionar `whatsapp_ativo` na interface `Pet`
- Adicionar toggle `Switch` ao lado do titulo "Pet #N" (linha 454)
- Implementar logica no `onCheckedChange` do toggle do cliente: quando desativado, desativar todos os pets; quando ativado, ativar todos os pets
- Implementar logica no `onCheckedChange` do toggle do pet: se cliente tem 1 pet e pet e desativado, desativar cliente tambem
- No `handleSubmit`, salvar `whatsapp_ativo` de cada pet (insert e update)
- No `handleEdit`, carregar `whatsapp_ativo` dos pets
- No `resetForm`, incluir `whatsapp_ativo: true` no pet padrao
- No `addPet`, incluir `whatsapp_ativo: true` no novo pet
- Atualizar `updatePet` para aceitar campo boolean

**3. `src/utils/whatsappScheduler.ts`**

- Adicionar `petNome?: string` ao `ScheduleParams` (ou reusar campo existente `nomePet`)
- Apos verificar `whatsapp_ativo` do cliente, buscar o pet pelo `cliente_id` + `nome_pet` e verificar `whatsapp_ativo` do pet
- Se pet `whatsapp_ativo === false`, retornar sem agendar

**4. `supabase/functions/whatsapp-scheduler/index.ts`**

- Nos 3 pontos onde ja verifica `whatsapp_ativo` do cliente, adicionar verificacao do pet:
  - Para agendamentos avulsos: buscar pet pelo `cliente_id` + nome do pet (campo `pet` do agendamento)
  - Para pacotes: buscar pet pelo nome do cliente + nome do pet
- Se pet `whatsapp_ativo === false`, cancelar/pular mensagem

### Resumo

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | Coluna `whatsapp_ativo boolean default true` em `pets` |
| `Clientes.tsx` | Switch por pet + logica de cascata |
| `whatsappScheduler.ts` | Checar flag do pet antes de agendar |
| `whatsapp-scheduler/index.ts` | Checar flag do pet antes de enviar |

