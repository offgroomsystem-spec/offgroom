


## Plano: Mensagens Automaticas de Clientes em Risco via WhatsApp

### Status: Estrutura base implementada ✅

### O que foi feito

1. **Tabela `whatsapp_mensagens_risco`** criada com RLS policies
2. **Edge Function `whatsapp-risco-scheduler`** implementada e deployada
   - Agrupa pets por `cliente_id` em uma unica mensagem
   - Verifica `whatsapp_ativo` do cliente e de cada pet
   - Usa concordancia de genero (o/a) baseada no sexo do pet
   - Envia via Evolution API com intervalo de 10s entre mensagens
   - Controla duplicidade (nao reenvia no mesmo dia)
3. **`ClientesEmRisco.tsx`** atualizado
   - Envio manual via WhatsApp agora agrupa todos os pets do mesmo cliente
   - Mensagens com artigos de genero corretos
4. **`pg_cron`** configurado para rodar diariamente as 10:00 UTC (07:00 BRT)

### Proximo passo

Aguardando os templates de mensagem por faixa de periodo (7-10, 11-15, 16-20, 21-30, 31-45, 46-90, +90 dias) para substituir os templates provisorios.
