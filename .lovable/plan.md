

## Plano: Corrigir e ativar o envio automatico de mensagens de risco

### Problemas encontrados

1. **Cron no horario errado**: O pg_cron esta configurado para `0 10 * * *` (10:00 UTC = **07:00 BRT**), mas a Edge Function rejeita chamadas antes das **08:00 BRT**. Resultado: todo dia a funcao e chamada e retorna "Fora do horario comercial" sem enviar nada.

2. **Falta entrada no config.toml**: A funcao `whatsapp-risco-scheduler` nao esta listada no `supabase/config.toml` com `verify_jwt = false`. Sem isso, a funcao pode exigir JWT valido e rejeitar a chamada do cron.

3. **Funcao possivelmente nao deployada**: Nao ha nenhum log da funcao, o que indica que ela pode nunca ter sido executada com sucesso.

### Correcoes

**1. Atualizar o pg_cron** — Mudar de `0 10 * * *` para `0 11 * * *` (11:00 UTC = 08:00 BRT)
- Isso garante que a funcao sera chamada exatamente quando o horario comercial comeca
- Usar SQL direto (unschedule + schedule) pois contem dados especificos do projeto

**2. Adicionar entrada no config.toml**
```toml
[functions.whatsapp-risco-scheduler]
verify_jwt = false
```

**3. Fazer deploy da funcao** — O deploy e automatico ao salvar o config.toml, forcando redeployment

### Resumo

| Problema | Correcao |
|---|---|
| Cron 10:00 UTC (07h BRT) vs funcao exige 08h+ | Mudar cron para 11:00 UTC (08h BRT) |
| Falta config.toml entry | Adicionar `verify_jwt = false` |
| Funcao sem logs/deploy | Redeploy automatico com alteracao |

