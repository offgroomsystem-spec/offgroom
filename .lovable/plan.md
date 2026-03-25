

## Plano: Alterar mensagem de 24h para 15h antes

Ajuste simples em 3 pontos: trocar a janela de 24 horas para 15 horas antes do agendamento, tanto para servicos avulsos quanto pacotes.

### Alteracoes

**1. `src/utils/whatsappScheduler.ts`** (frontend scheduling)
- Linha 154-171: Trocar `24 * 60` por `15 * 60` na condicao e no calculo do horario (`- 15 * 60 * 60 * 1000` em vez de `- 24 * 60 * 60 * 1000`)
- Manter tipo_mensagem como `"24h"` internamente (ou renomear para `"15h"`) para nao quebrar queries existentes — recomendo renomear para `"15h"`

**2. `supabase/functions/whatsapp-scheduler/index.ts`** — Agendamentos avulsos
- Linha 533-546: Trocar `24 * 60` por `15 * 60` e `24 * 60 * 60 * 1000` por `15 * 60 * 60 * 1000`

**3. `supabase/functions/whatsapp-scheduler/index.ts`** — Pacotes
- Linha 719-725: Mesma troca de 24 para 15

A logica de ajuste para 7h BRT permanece igual (se o horario calculado cair antes das 7h, agendar para 7h).

### Resumo

| Arquivo | Mudanca |
|---|---|
| `whatsappScheduler.ts` | 24h → 15h (linhas 154-171) |
| `whatsapp-scheduler/index.ts` | 24h → 15h avulsos (linhas 533-546) |
| `whatsapp-scheduler/index.ts` | 24h → 15h pacotes (linhas 719-725) |

