

## Correções no Sistema de Mensagens WhatsApp

### Problema 1: Mensagens não sincronizam quando horário do agendamento é alterado (Moacir Melo)

Quando o horário de um agendamento é editado, as mensagens pendentes em `whatsapp_mensagens_agendadas` ficam com o texto antigo (horário 13:30 em vez de 10:30). Nenhuma parte do código atualiza ou recria as mensagens ao editar um agendamento.

**Solução:** Na função `handleAtualizarAgendamento` (linha ~2241 do Agendamentos.tsx), após salvar a edição no banco:
1. Deletar todas as mensagens pendentes (`status = 'pendente'`) do agendamento editado
2. Rechamar `scheduleWhatsAppMessages` com os dados atualizados para recriar as mensagens com horários corretos

Isso vale tanto para agendamentos simples (deletar por `agendamento_id`) quanto pacotes (deletar por `agendamento_pacote_id` + `servico_numero`).

### Problema 2: Clique no ícone WhatsApp dispara mensagem 30min prematuramente (Gian)

O clique manual no ícone WhatsApp (`enviarWhatsAppDireto`) envia a mensagem de confirmação via Evolution API. Porém, o scheduler auto-create no backend detecta que esse agendamento não tem mensagens na tabela e cria uma mensagem `3h` (tipo confirmação) com `agendado_para = now()`, que é enviada imediatamente. Isso não deveria acontecer porque o envio manual já foi feito.

**Solução:** Quando o usuário clica no ícone WhatsApp para enviar manualmente, inserir um registro na tabela `whatsapp_mensagens_agendadas` com `tipo_mensagem = '3h'` e `status = 'enviado'` (já marcado como enviado). Isso faz o scheduler backend ver que já existe uma mensagem `3h` e não criar duplicatas. As mensagens de 30min e 24h continuam agendadas normalmente.

### Problema 3: Pet Pronto — enviar via API ao invés de abrir link

Atualmente `handlePetProntoConfirm` abre `window.open(url, '_blank')` com link wa.me. Precisa enviar via Evolution API usando a mesma fila de 10 segundos.

**Solução:** Substituir a chamada `window.open(url, '_blank')` por envio direto via `supabase.functions.invoke("evolution-api", ...)`, usando a mesma lógica de fila (`sendQueueRef` + `processarFilaEnvios`). Manter fallback wa.me se WhatsApp não estiver conectado.

Texto "Pet Pronto" com Taxi Dog "Sim":
```
Oii [Nome]!
Passando para avisar que [o/a] [Pet] já está [pronto/pronta]!
Já já o Taxi Dog chega e [ele/ela] estará indo de volta pra casa!
```

Texto "Pet Pronto" com Taxi Dog "Não":
```
Oii [Nome]!
Passando para avisar que [o/a] [Pet] já está [pronto/pronta] para ir para casa!
[Ele/Ela] está [ansioso/ansiosa] te esperando para [buscá-lo/buscá-la]! 😌
```

Notar: sem espaçamento entre linhas (usar `\n` simples, não `\n\n`).

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/pages/Agendamentos.tsx` | 1. Sincronizar mensagens ao editar agendamento (deletar pendentes + recriar) |
| `src/pages/Agendamentos.tsx` | 2. Marcar mensagem como "enviada" ao clicar WhatsApp manual |
| `src/pages/Agendamentos.tsx` | 3. Pet Pronto: enviar via API com fila de 10s + textos corretos |
| `src/utils/whatsappScheduler.ts` | Exportar função auxiliar para deletar mensagens pendentes |

