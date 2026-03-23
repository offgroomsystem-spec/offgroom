

## Envio Automático de Mensagens WhatsApp para Agendamentos

### Visao Geral

Criar um sistema de envio automatizado de mensagens de confirmação de agendamentos via Evolution API, com regras de temporização específicas, usando uma edge function agendada via `pg_cron` (já habilitado no projeto).

### Arquitetura

```text
pg_cron (a cada 1 min)
  └─> Edge Function "whatsapp-scheduler"
        ├─ Busca agendamentos do dia + dia seguinte
        ├─ Verifica regras de temporização
        ├─ Monta mensagem personalizada
        ├─ Envia via Evolution API (intervalo 10s entre msgs)
        └─ Registra envio em tabela de controle
```

### Etapa 1 — Migration: Tabela de controle de envios + coluna de agendamento imediato

Nova tabela `whatsapp_mensagens_agendadas` para rastrear quais mensagens já foram enviadas (evitar duplicatas):

```sql
CREATE TABLE public.whatsapp_mensagens_agendadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agendamento_id uuid,           -- para avulsos
  agendamento_pacote_id uuid,    -- para pacotes
  servico_numero text,           -- numero do servico no pacote (ex: "01/04")
  tipo_mensagem text NOT NULL,   -- '24h', '3h', '30min', 'imediata'
  status text NOT NULL DEFAULT 'pendente', -- 'pendente', 'enviado', 'falha', 'cancelado'
  mensagem text,
  numero_whatsapp text NOT NULL,
  agendado_para timestamptz NOT NULL,
  enviado_em timestamptz,
  erro text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agendamento_id, tipo_mensagem),
  UNIQUE(agendamento_pacote_id, servico_numero, tipo_mensagem)
);

ALTER TABLE public.whatsapp_mensagens_agendadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own whatsapp messages"
  ON public.whatsapp_mensagens_agendadas FOR ALL TO public
  USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));
```

### Etapa 2 — Edge Function `whatsapp-scheduler`

Nova edge function `supabase/functions/whatsapp-scheduler/index.ts` invocada pelo cron a cada minuto. Lógica:

1. **Buscar todos os users com instância WhatsApp conectada** (`whatsapp_instances` com `status = 'connected'`)
2. Para cada user, buscar agendamentos (avulsos + pacotes) de hoje e amanhã
3. Para cada agendamento, buscar sexo do pet na tabela `pets` e bordão em `empresa_config`
4. Aplicar as regras de temporização:

**Regras de envio:**
- **24h antes**: se faltam ~24h para o agendamento e msg "24h" ainda não enviada
- **3h antes**: se faltam ~3h para o agendamento e msg "3h" ainda não enviada
- **Exceção manhã (7h)**: se o agendamento é antes das 10h, a mensagem "3h antes" é enviada às 7h
- **30min antes (só Taxi Dog = Não)**: mensagem especial de lembrete
- **Agendamento imediato**: se agendamento criado com mais de 61 min de antecedência e Taxi Dog = "Não", enviar imediatamente

**Regra de intervalo**: 10 segundos entre cada envio (usar `await sleep(10000)` no loop)

**Regras de exclusão**:
- Agendamento criado dentro de 1h do horário de início: não enviar automático
- Taxi Dog = "Sim": não enviar mensagem de 30min
- WhatsApp desconectado: não enviar (mensagens ficam como "pendente" mas não são reenviadas depois que o horário passa)

5. **Montagem da mensagem** com 3 templates:
   - **Avulso**: inclui `*Pacote de serviços:* Sem Pacote 😕`
   - **Pacote (não último)**: inclui `*N° do Pacote:* [numero]`
   - **Pacote (último)**: inclui texto de renovação
   - **30min/imediata**: mensagem curta de lembrete

6. Chamar Evolution API diretamente (server-side, sem passar pela edge function evolution-api)

### Etapa 3 — Agendar cron job via pg_cron

Inserir via SQL (não migration — contém dados específicos do projeto):

```sql
SELECT cron.schedule(
  'whatsapp-scheduler-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://etqxzujphligtsvehxoj.supabase.co/functions/v1/whatsapp-scheduler',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbG..."}'::jsonb,
    body:='{"time":"now"}'::jsonb
  ) as request_id;
  $$
);
```

### Etapa 4 — Agendar mensagens na criação do agendamento

No `Agendamentos.tsx`, após salvar um agendamento (avulso ou pacote), inserir registros em `whatsapp_mensagens_agendadas` com os horários calculados:

- Calcular `agendado_para` para cada tipo (24h, 3h, 30min)
- Para agendamentos imediatos (>61min de antecedência + Taxi Dog = Não): inserir com `tipo_mensagem = 'imediata'` e `agendado_para = now()`
- Para agendamentos dentro de 1h: não inserir nenhuma mensagem

### Etapa 5 — Marcar mensagens como canceladas se WhatsApp desconectado

A edge function `whatsapp-scheduler` verifica se `whatsapp_instances.status = 'connected'`. Se não, pula o envio. Mensagens cujo `agendado_para` já passou e não foram enviadas permanecem como "pendente" mas não são reenviadas ao reconectar (o horário já passou).

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migration SQL | Criar tabela `whatsapp_mensagens_agendadas` |
| `supabase/functions/whatsapp-scheduler/index.ts` | Nova edge function (cron) |
| `src/pages/Agendamentos.tsx` | Inserir mensagens agendadas ao criar agendamento |
| SQL insert (pg_cron) | Agendar cron job a cada minuto |

### Templates de mensagem

**Confirmação Avulso:**
> Oi, [PrimeiroNome]! Passando apenas para confirmar o agendamento [do/da] [NomePet] com a gente.
> *Dia:* [Data] *Horario:* [Hora] *Serviço:* [Serviços] *Pacote de serviços:* Sem Pacote 😕 *Taxi Dog:* [Sim/Não]
> *[Bordão]*

**Confirmação Pacote (não último):**
> Mesmo formato, mas com *N° do Pacote:* [X/Y] no lugar de "Sem Pacote"

**Confirmação Pacote (último):**
> Mesmo formato + texto de renovação

**Lembrete 30min (Taxi Dog = Não):**
> Oi [PrimeiroNome]! 😄 Não esqueça de trazer [o/a] [NomePet] hoje às [Hora]. Esse horário estamos por aqui prontos para receber [ele/ela]! 🐾💙

