

## Plano: Arquitetura duas fases + escalonamento 5s entre instancias

### Problema atual
A funcao usa `await sleep(5min)` entre envios, causando timeout da Edge Function apos 1 mensagem.

### Solucao

Reescrever `whatsapp-risco-scheduler/index.ts` com arquitetura em duas fases e cron a cada minuto.

**Fase 1 - Agendamento (1x por dia, quando horaBRT=8 e nao ha pendentes hoje):**
- Identificar clientes elegiveis (toda logica atual de risco permanece)
- Para cada instancia, escalonar `agendado_para` com 5min entre clientes:
  - Instancia A (index 0): 08:00:00, 08:05:00, 08:10:00...
  - Instancia B (index 1): 08:00:05, 08:05:05, 08:10:05...
  - Instancia C (index 2): 08:00:10, 08:05:10, 08:10:10...
- O offset de 5 segundos por instancia evita sobrecarga no servidor

**Fase 2 - Envio (cron cada minuto):**
- Buscar 1 mensagem por instancia com `status='pendente'` e `agendado_para <= agora`
- Enviar via Evolution API, atualizar status
- Sem sleep — funcao termina em segundos

### Alteracoes

**1. `supabase/functions/whatsapp-risco-scheduler/index.ts`**

Reescrever logica principal:
- Remover `sleep(INTERVALO_ENVIO_MS)` (linha 441)
- Adicionar deteccao automatica de fase:
  - Se existem mensagens pendentes hoje → Fase Envio (busca 1 por instancia, envia, retorna)
  - Se nao existem e horaBRT == 8 → Fase Agendamento (insere registros com `agendado_para` escalonado)
- No agendamento, calcular offset por instancia: `instanceIndex * 5000ms` adicionado ao `agendado_para` base
- Toda logica de elegibilidade, templates, unificacao de pets e concordancia de genero permanece identica

```text
Escalonamento por instancia (5s offset):
  base = 08:00:00 BRT (11:00:00 UTC)
  
  Instancia 0, cliente 1: 08:00:00
  Instancia 1, cliente 1: 08:00:05
  Instancia 2, cliente 1: 08:00:10
  
  Instancia 0, cliente 2: 08:05:00
  Instancia 1, cliente 2: 08:05:05
  Instancia 2, cliente 2: 08:05:10
```

**2. Alterar cron job via SQL**

De `0 11 * * *` (1x/dia) para `* 11-21 * * 1-5` (cada minuto, seg-sex, 08-18h BRT).

### Resultado
- Cada instancia processa sua fila independentemente com 5s de diferenca entre elas
- Sem risco de timeout (funcao executa em <5s por ciclo)
- Intervalo de 5min entre mensagens da mesma instancia mantido
- Todas as instancias iniciam envio proximo das 08:00, com leve escalonamento

