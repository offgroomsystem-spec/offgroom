

## Plano: Corrigir envio automático de mensagens "Clientes em Risco"

### Causa raiz

O `whatsapp-risco-scheduler` filtra instancias com `status = 'open'` (linha 169), mas todas as instancias no banco estao com `status = 'connected'`. O scheduler regular (`whatsapp-scheduler`) usa corretamente `.eq("status", "connected")`. Por isso a funcao retorna "Nenhuma instancia ativa" e nenhuma mensagem eh processada.

### Evidencias

- Cron job executou hoje as 11:00 UTC (08:00 BRT) com sucesso (`status: succeeded`)
- Tabela `whatsapp_mensagens_risco`: 0 registros (nunca enviou)
- Tabela `whatsapp_instances`: 4 instancias, todas com `status = 'connected'`
- 4 empresas com `evolution_auto_send = true`

### Alteracao

**Arquivo: `supabase/functions/whatsapp-risco-scheduler/index.ts`**

Linha 169: Trocar `.eq("status", "open")` por `.eq("status", "connected")` para alinhar com o scheduler regular.

### Resultado

A partir do proximo ciclo (amanha 08:00 BRT), a funcao encontrara as instancias conectadas e processara os clientes em risco normalmente, respeitando todas as regras existentes (whatsapp_ativo, janela seg-sex 08h-18h, intervalo 5min, unificacao de pets por cliente).

