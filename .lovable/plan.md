

# Plan: Financial Sync for Package Appointment Edits (Respecting Payment Status)

## Problem

When editing a package appointment and adding/removing extra services, the financial entry is **not updated**. The sync logic (full replace strategy) currently only runs for "simples" appointments — the "pacote" branch at line 3080 has no financial sync code.

## Solution

Add financial synchronization logic to the **pacote edit branch** (after line 3115, inside `handleSalvarEdicao`), with behavior that depends on the `pago` (paid) status of the linked financial entry.

### File to Edit: `src/pages/Agendamentos.tsx`

### Logic to Add (after the pacote `agendamentos_pacotes` update succeeds, ~line 3115):

**Step 1 — Determine current services from the edited pacote**
- Build the full list: the package name (main item) + all `servicosExtrasEdicao` with their values.

**Step 2 — Check if a linked financial entry exists (`lancamentoVinculado`)**

**Step 3 — Branch by payment status:**

#### If `lancamentoVinculado.pago === false`:
- **Full replace strategy** (same pattern as simples):
  1. Delete all existing `lancamentos_financeiros_itens` for this `lancamento_id`
  2. Insert new items: package name + each extra service as individual rows
  3. Recalculate `valor_total` from all items and update the `lancamentos_financeiros` record
  4. Refresh via `loadFinanceiroVinculado`

#### If `lancamentoVinculado.pago === true`:
- **Do NOT modify** the existing financial entry
- Compare current extras vs. what was in the original financial entry to find **newly added services only**
- If new services exist, **create a new `lancamentos_financeiros`** record:
  - Same `user_id`, `cliente_id`, `pet_ids`, `conta_id`, `tipo`, `descricao1`
  - `data_pagamento` = appointment date (`editandoAgendamento.data`)
  - `ano` / `mes_competencia` derived from the appointment date
  - `pago = false`
  - `valor_total` = sum of new extras only
- Insert items for the new extras into `lancamentos_financeiros_itens`

**Step 4 — After the pacote save, call `loadFinanceiroVinculado`** to refresh state (currently missing — also add `await loadFinanceiroVinculado(editandoAgendamento)` after `loadAgendamentosPacotes()`).

### Also in `useCriarLancamentoAutomatico.ts`
No changes needed — initial creation logic is correct. The gap is only in the **edit** flow.

### Summary of Changes

| What | Where |
|---|---|
| Add financial sync for pacote edits (unpaid: full replace, paid: new entry for extras) | `Agendamentos.tsx` ~line 3115-3148 |
| Add `loadFinanceiroVinculado` call after pacote save | `Agendamentos.tsx` ~line 3148 |

