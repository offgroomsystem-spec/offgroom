

## Plano: Reescrever sistema de mensagens de risco com sequencia de 7 tentativas

### Resumo

Reescrever a Edge Function `whatsapp-risco-scheduler` e atualizar o frontend para implementar um sistema de 7 mensagens sequenciais com intervalos progressivos, templates diferenciados para 1 pet vs multiplos pets, envio apenas em dias uteis (seg-sex, 08h-18h BRT), intervalo de 5 minutos entre envios, e faixa de 9 a 110 dias sem agendamento.

### Regras de negocio

- **Faixa**: apenas pets com 9 a 110 dias sem agendamento futuro
- **Ordem de envio**: dos mais recentes (9 dias) para os mais antigos
- **Dias/horario**: seg-sex, 08h-18h BRT apenas
- **Intervalo entre mensagens**: 5 minutos (sleep 300000ms)
- **Sequencia de tentativas** (dias corridos entre cada):
  1. 1a mensagem: imediata (quando entra na faixa de 9 dias)
  2. 2a: +10 dias apos a 1a
  3. 3a: +12 dias apos a 2a
  4. 4a: +14 dias apos a 3a
  5. 5a: +16 dias apos a 4a
  6. 6a: +18 dias apos a 5a
  7. 7a (ultima): +20 dias apos a 6a
- Se a data calculada cair em sabado/domingo → proximo dia util
- Template escolhido pela faixa de dias do pet (maxDias entre os pets do cliente)
- Templates diferentes para 1 pet (singular) vs 2+ pets (plural)
- Sem `\n\n` entre linhas — apenas `\n` simples

### Alteracoes

**1. Migracao SQL** — Adicionar coluna `tentativa` na tabela `whatsapp_mensagens_risco`
```sql
ALTER TABLE public.whatsapp_mensagens_risco 
ADD COLUMN IF NOT EXISTS tentativa integer NOT NULL DEFAULT 1;
```

**2. Edge Function `whatsapp-risco-scheduler/index.ts`** — Reescrita completa

Logica principal:
- Verificar hora BRT atual: se fora de seg-sex 08h-18h, retornar sem enviar
- Para cada instancia ativa com `evolution_auto_send`:
  - Buscar agendamentos e pacotes (paginados), clientes, pets
  - Calcular `dias_sem_agendar` por pet (mesma logica existente)
  - Filtrar: 9 <= dias <= 110, sem agendamento futuro, `whatsapp_ativo` do cliente e pet
  - Agrupar por `cliente_id`
  - Buscar historico de `whatsapp_mensagens_risco` para cada cliente (tentativas ja enviadas)
  - Para cada grupo:
    - Se tentativa 7 ja enviada → pular
    - Calcular proxima tentativa e data prevista com base nos intervalos [0, 10, 12, 14, 16, 18, 20]
    - Se data prevista cai em fim de semana → proximo dia util
    - Se hoje >= data prevista → enviar
  - Ordenar envios dos mais recentes (menor dias_sem_agendar) para os mais antigos
  - Intervalo de 5 minutos entre cada envio
  - Registrar com campo `tentativa` na tabela

Templates (14 no total: 7 faixas x 2 variantes singular/plural):
- Todos os templates fornecidos pelo usuario serao implementados literalmente
- Concordancia de genero completa: o/a, ele/ela, dele/dela, cheiroso/cheirosa, limpinho/limpinha, eles/elas, deles/delas, cheirosos/cheirosas
- Para multiplos pets com generos mistos: usar forma masculina plural (padrao portugues)
- `[Numero de dias do ultimo agendamento]` substituido pelo `maxDias` real
- Sem `\n\n` — apenas `\n` entre todas as linhas

**3. Frontend `ClientesEmRisco.tsx`** — Atualizar templates

- Substituir `gerarMensagemAgrupada` com os mesmos 14 templates novos (para o link manual wa.me)
- Manter `montarListaPets` com artigos de genero

**4. pg_cron** — Ajustar frequencia

- Alterar de 1x/dia para a cada 5 minutos (ou manter diario e processar lote interno com sleeps)
- Recomendacao: manter cron diario as 08:00 BRT, a funcao processa todos os envios pendentes com sleep de 5min entre cada

### Detalhes tecnicos

**Calculo de proxima data de envio:**
```
intervalos = [0, 10, 12, 14, 16, 18, 20]
proxima_data = data_ultimo_envio + intervalos[proxima_tentativa - 1] dias
se proxima_data cai em sabado → proxima_data = segunda
se proxima_data cai em domingo → proxima_data = segunda
```

**Determinacao de genero para multiplos pets:**
- Se todos femea → usar feminino plural (elas, delas, cheirosas)
- Se algum macho ou misto → usar masculino plural (eles, deles, cheirosos)

**Funcao helper de genero:**
```typescript
function genero(pets, masc_s, fem_s, masc_p, fem_p) {
  if (pets.length === 1) {
    return isFemea(pets[0]) ? fem_s : masc_s;
  }
  return todosFemea(pets) ? fem_p : masc_p;
}
```

### Resumo de arquivos

| Arquivo | Mudanca |
|---|---|
| Migracao SQL | Adicionar coluna `tentativa` |
| `whatsapp-risco-scheduler/index.ts` | Reescrita completa com 7 tentativas, intervalos, templates, horario comercial |
| `ClientesEmRisco.tsx` | Atualizar templates do link manual wa.me |

