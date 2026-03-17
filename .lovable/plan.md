

## Clonagem de Dados e Acesso VIP para Conta de Demonstração

### Resumo dos dados na conta de origem (`rodrygo.sv12@gmail.com` / `e368f8e7-dae7-4e29-aed6-9bce03b6bb94`)

| Tabela | Total | ~50% |
|--------|-------|------|
| clientes | 224 | 112 |
| pets | 300 | ~150 (vinculados aos clientes selecionados) |
| racas | 6 | 6 (todas, são poucas) |
| servicos | 18 | 18 (todos, são poucos) |
| pacotes | 4 | 4 (todos) |
| groomers | 3 | 3 (todos) |
| contas_bancarias | 3 | 3 (todas) |
| formas_pagamento | 3 | 3 (todas) |
| fornecedores | 35 | 18 |
| empresa_config | 1 | 1 |
| agendamentos | 422 | ~211 (mais recentes) |
| agendamentos_pacotes | 260 | ~130 (mais recentes) |
| lancamentos_financeiros | 830 | ~415 (mais recentes) |
| lancamentos_financeiros_itens | 1061 | ~relacionados aos lançamentos clonados |

Conta de destino (`carloseduardopereira2254@gmail.com` / `85c44900-5f73-47fb-acb9-233cfc1b4917`) está vazia.

### Plano de Execução

**Parte 1 - Acesso VIP vitalício**
- Adicionar `carloseduardopereira2254@gmail.com` ao array `VIP_EMAILS` em `supabase/functions/check-subscription-status/index.ts`
- Atualizar o profile da conta destino: `plano_ativo = 'VIP Vitalício'`, `pagamento_em_dia = 'Sim'`

**Parte 2 - Script de clonagem (via edge function temporária ou exec)**

Ordem de clonagem respeitando dependências:

1. **Tabelas independentes** (clonar 100% por serem configurações pequenas):
   - `racas`, `servicos`, `pacotes`, `groomers`, `contas_bancarias`, `formas_pagamento`, `empresa_config`

2. **Clientes** (~50%, os 112 mais recentes por `created_at`):
   - Gerar mapeamento `old_id → new_id` para manter referências

3. **Pets** (todos os pets vinculados aos clientes clonados):
   - Usar mapeamento de `cliente_id` para o novo ID

4. **Fornecedores** (~50%, 18 mais recentes):
   - Gerar mapeamento `old_id → new_id`

5. **Agendamentos** (~50%, 211 mais recentes):
   - Mapear `cliente_id` usando mapeamento de clientes

6. **Agendamentos Pacotes** (~50%, 130 mais recentes)

7. **Contas bancárias** → gerar mapeamento para uso nos lançamentos

8. **Lançamentos financeiros** (~50%, 415 mais recentes):
   - Mapear `cliente_id`, `conta_id`, `fornecedor_id` usando mapeamentos anteriores

9. **Lançamentos financeiros itens** (todos vinculados aos lançamentos clonados)

O script será executado via `lov-exec` com `psql`, usando INSERTs com `SELECT` e mapeamentos de IDs via tabelas temporárias. Todos os registros clonados terão `user_id = '85c44900-5f73-47fb-acb9-233cfc1b4917'`.

### Arquivos Modificados
- `supabase/functions/check-subscription-status/index.ts` — adicionar email ao VIP_EMAILS

