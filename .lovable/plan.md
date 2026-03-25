

## Plano: Mensagens Automaticas de Clientes em Risco via WhatsApp

### O que sera feito

Criar um sistema automatizado que envia mensagens WhatsApp para clientes em risco, agrupando todos os pets do mesmo `cliente_id` em uma unica mensagem. O envio respeitara os toggles `whatsapp_ativo` do cliente e de cada pet.

### Estrutura Geral

1. **Nova tabela** `whatsapp_mensagens_risco` para controlar quais clientes ja receberam mensagem e quando, evitando duplicidade
2. **Nova Edge Function** `whatsapp-risco-scheduler` que roda periodicamente via `pg_cron`, agrupa pets por `cliente_id`, verifica toggles e envia via Evolution API
3. **Ajuste no `ClientesEmRisco.tsx`** para exibir status de envio e permitir envio manual agrupado

### Detalhes

**1. Migracao SQL — Nova tabela de controle**

```sql
CREATE TABLE public.whatsapp_mensagens_risco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL,
  pets_incluidos jsonb NOT NULL DEFAULT '[]', -- [{nome_pet, dias_sem_agendar, sexo}]
  mensagem text,
  numero_whatsapp text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  agendado_para timestamptz NOT NULL,
  enviado_em timestamptz,
  erro text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.whatsapp_mensagens_risco ENABLE ROW LEVEL SECURITY;
-- RLS policies similares as de whatsapp_mensagens_agendadas
```

**2. Edge Function `whatsapp-risco-scheduler`**

- Busca clientes em risco (mesma logica do frontend: sem agendamento futuro, 7+ dias)
- Agrupa pets por `cliente_id` (mesmo dono = mesma mensagem)
- Para cada grupo:
  - Verifica `whatsapp_ativo` do cliente na tabela `clientes`
  - Filtra pets com `whatsapp_ativo = false` na tabela `pets`
  - Se nenhum pet restante, pula
  - Monta mensagem unificada com concordancia de genero (o/a conforme sexo de cada pet)
  - Envia via Evolution API
- Marca status como `enviado` ou `erro`

**3. Logica de agrupamento de pets na mensagem**

Exemplo com 3 pets (Theo macho, Amora femea, Meg femea):
```
"Oi, Bianca!

Separei alguns horários especiais essa semana e lembrei de vocês 😊

O Theo, a Amora, a Meg já estão na hora daquele banho caprichado 🛁✨
Quer que eu garanta um horário pra você?"
```

A funcao recebera a lista de pets com sexo e montara a string concatenada com artigos corretos.

**4. Periodicidade**

- Aguardando o proximo prompt do usuario com os templates por faixa de dias
- O `pg_cron` sera configurado conforme a periodicidade definida pelo usuario

**5. Verificacao de toggles**

- Cliente `whatsapp_ativo = false` → nenhuma mensagem
- Pet individual `whatsapp_ativo = false` → pet removido da lista, se sobrar outros pets, mensagem enviada sem ele
- Se todos os pets do cliente estao desativados → nenhuma mensagem

### Proximo passo

Aguardo o proximo prompt com a formatacao de texto para cada faixa de periodo (7-10 dias, 11-15 dias, etc.) para finalizar os templates da Edge Function.

### Resumo

| Componente | Mudanca |
|---|---|
| Migracao SQL | Tabela `whatsapp_mensagens_risco` |
| Edge Function | `whatsapp-risco-scheduler` com agrupamento por cliente |
| `ClientesEmRisco.tsx` | Ajuste no envio manual para agrupar pets do mesmo cliente |
| `pg_cron` | Job periodico para disparar a Edge Function |

