

# Prompt para Correção de conta_id nos Lançamentos Financeiros

## Contexto

O usuário migrou o projeto para um novo Lovable com Supabase. Os lançamentos financeiros (`lancamentos_financeiros`) perderam a referência ao banco (`conta_id` ficou `null`), mas as contas bancárias já estão cadastradas na tabela `contas_bancarias`. Ele precisa de um prompt detalhado para colar no chat do novo projeto.

## Plano

Vou gerar um prompt completo e detalhado explicando:
1. A estrutura das tabelas envolvidas
2. O relacionamento entre `lancamentos_financeiros.conta_id` e `contas_bancarias.id`
3. Como o novo projeto deve re-vincular os dados
4. Como os relatórios financeiros usam essa relação

**Entregarei o prompt como texto pronto para copiar e colar.**

## Etapa única

- Gerar o prompt completo em texto, baseado no schema conhecido (`lancamentos_financeiros.conta_id` → `contas_bancarias.id/nome`), explicando ao novo projeto como diagnosticar e corrigir o problema.

