

## Diagnóstico e Plano de Ação

### O que foi encontrado

1. **A edge function `whatsapp-scheduler` não estava deployada.** O cron job existia e rodava a cada minuto, mas a função retornava 404. Já deployei agora e ela processou com sucesso — enviou 1 mensagem pendente (a "imediata" para Rodrygo/Teste Grande).

2. **O cron job está ativo e funcionando.** A cada minuto ele chamará a edge function, que buscará mensagens pendentes com `agendado_para <= now()` e enviará.

3. **As mensagens só são criadas quando o agendamento é salvo no frontend** (via `scheduleWhatsAppMessages`). Os agendamentos de hoje que foram criados antes do sistema de mensagens existir (Daniela/Moana, Daniela/Cruela, Cleuza/Luck, Debora/Tói, Marli/Cloe, etc.) **não têm mensagens na fila**.

4. **A mensagem de 30min do Rodrygo** está agendada para 11:00 UTC (8:00 BRT) — será enviada automaticamente pelo cron quando chegar a hora.

### O que precisa ser feito

**Criar mensagens retroativas para os agendamentos de hoje que ainda não têm mensagens na fila.** Isso requer inserir registros na tabela `whatsapp_mensagens_agendadas` para cada agendamento de hoje (avulso e pacote) dos usuários com WhatsApp conectado, calculando os horários corretos (3h antes, 30min antes se Taxi Dog = Não).

### Alterações

**1. Criar uma edge function temporária ou script para gerar mensagens retroativas**

Adicionar lógica na edge function `whatsapp-scheduler` para, além de processar mensagens pendentes, também verificar agendamentos de hoje e amanhã que ainda não têm mensagens na tabela e criá-las automaticamente. Isso resolve tanto o problema atual (agendamentos antigos sem mensagens) quanto garante que novos agendamentos criados por qualquer via sempre terão mensagens.

**Arquivo: `supabase/functions/whatsapp-scheduler/index.ts`**

Após processar mensagens pendentes, adicionar uma etapa que:
- Busca agendamentos avulsos de hoje e amanhã para os usuários ativos
- Busca agendamentos de pacotes de hoje e amanhã
- Para cada um, verifica se já existe registro em `whatsapp_mensagens_agendadas`
- Se não existe, calcula os horários e insere as mensagens seguindo as regras (24h, 3h, 30min, 7h da manhã)
- Busca sexo do pet, bordão da empresa, e monta a mensagem correta

Isso torna o sistema proativo: mesmo que o frontend não tenha agendado as mensagens (por bug, versão antiga, etc.), o scheduler garante que elas serão criadas.

**2. Deploy imediato da função atualizada**

Após a alteração, deployar a edge function para que o cron já comece a processar os agendamentos de hoje.

### Detalhes técnicos da lógica de auto-criação

```text
Para cada user ativo (WhatsApp conectado + auto_send = true):
  1. Buscar agendamentos (avulsos) de hoje e amanhã
  2. Buscar servicos de pacotes (agendamentos_pacotes.servicos) de hoje e amanhã
  3. Para cada um:
     a. Verificar se já tem registro em whatsapp_mensagens_agendadas
     b. Se não tem, buscar pet.sexo e empresa_config.bordao
     c. Calcular horários: 24h, 3h (min 7h BRT), 30min (se taxi_dog=Não)
     d. Inserir mensagens com status='pendente'
     e. Se horário já passou, não inserir
```

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/whatsapp-scheduler/index.ts` | Adicionar lógica de auto-criação de mensagens para agendamentos sem mensagens |

### Resultado esperado

- Todos os agendamentos de hoje (e futuros) terão mensagens criadas automaticamente pelo scheduler
- As mensagens cujo horário já passou não serão criadas
- As mensagens cujo horário ainda não chegou serão processadas quando o cron executar no momento certo
- O sistema fica resiliente: mesmo sem o frontend agendar, o scheduler cria as mensagens

