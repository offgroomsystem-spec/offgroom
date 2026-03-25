

## Plano: Sistema de mensagens de risco com 7 tentativas (CONCLUÍDO)

### Implementado

1. **Migração SQL** — Coluna `tentativa` adicionada à tabela `whatsapp_mensagens_risco`
2. **Edge Function `whatsapp-risco-scheduler`** — Reescrita completa com:
   - Envio apenas seg-sex, 08h-18h BRT
   - 7 tentativas com intervalos [0, 10, 12, 14, 16, 18, 20] dias
   - Faixa: 9 a 110 dias sem agendamento
   - Ordem: mais recentes primeiro
   - Intervalo de 5 minutos entre envios
   - 14 templates (7 singular + 7 plural) com concordância de gênero
   - Datas em fim de semana → próximo dia útil
3. **Frontend `ClientesEmRisco.tsx`** — Templates atualizados para os novos 14 textos
