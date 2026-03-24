

## Plano: Corrigir Sincronização de Mensagens WhatsApp

### Problemas Identificados

**Problema 1 (Melissa):** Quando o edge function pega uma mensagem pendente para enviar, ele envia o texto que foi salvo no momento da criação. Se o usuário editou o agendamento entre a criação da mensagem e o envio, a mensagem vai com dados antigos. A solução: o edge function deve **regenerar o conteúdo da mensagem** no momento do envio, relendo os dados atuais do agendamento.

**Problema 2 (Meire):** O `scheduleWhatsAppMessages` cria uma mensagem "imediata" com texto "Não esqueça de trazer hoje" quando `diffMinutes > 61 && diffMinutes <= 24*60`. Isso significa que se o agendamento é amanhã (ex: ~21h de diferença), o sistema envia HOJE a mensagem dizendo "hoje às 11:00", quando na verdade o serviço é amanhã. A lógica da mensagem "imediata" precisa ser removida ou restrita ao mesmo dia.

**Problema 3 (Exclusão):** Ao excluir um agendamento, o `confirmarExclusao` não chama `deletePendingMessages`, então mensagens pendentes continuam na fila.

### Alterações

**1. `supabase/functions/whatsapp-scheduler/index.ts`** — Regenerar mensagem antes de enviar

No loop de envio (linhas ~200-234), antes de enviar cada mensagem:
- Se `msg.agendamento_id` existe: buscar dados atuais do agendamento na tabela `agendamentos`. Se o agendamento não existe mais (foi deletado), marcar como "cancelado" e pular. Caso contrário, regenerar o texto da mensagem com os dados atuais (horário, data, serviço).
- Se `msg.agendamento_pacote_id` existe: buscar dados atuais do pacote em `agendamentos_pacotes`, localizar o serviço pelo `servico_numero`, e regenerar o texto.
- Enviar a mensagem regenerada em vez da armazenada.

Isso resolve o Problema 1: mesmo que a mensagem foi criada com dados antigos, no momento do envio ela terá os dados corretos.

**2. `src/utils/whatsappScheduler.ts`** — Remover lógica "imediata"

Remover o bloco de "MENSAGEM LEMBRETE IMEDIATA" (linhas 196-205) que envia o lembrete "Não esqueça de trazer hoje" imediatamente ao criar o agendamento. Esse tipo de mensagem só faz sentido 30min antes, e já é coberto pelo bloco de 30min. A mensagem com "hoje" sendo enviada no dia anterior é o bug da Meire.

**3. `src/pages/Agendamentos.tsx`** — Deletar mensagens ao excluir agendamento

Na função `confirmarExclusao` (linhas ~2478-2535):
- Para agendamento simples: chamar `await deletePendingMessages({ agendamentoId: id })` antes de deletar.
- Para agendamento de pacote: chamar `await deletePendingMessages({ agendamentoPacoteId: pacoteId, servicoNumero: numero })` antes de remover o serviço.

### Resumo das Mudanças

| Arquivo | O que muda |
|---|---|
| `supabase/functions/whatsapp-scheduler/index.ts` | Regenerar mensagem com dados atuais antes de enviar; cancelar mensagem se agendamento foi deletado |
| `src/utils/whatsappScheduler.ts` | Remover bloco "imediata" que envia lembrete "hoje" prematuramente |
| `src/pages/Agendamentos.tsx` | Adicionar `deletePendingMessages` na exclusão de agendamentos |

