

## Correções: Mês Competência e Persistência de Formas de Pagamento

### Problema 1: Mês Competência com formato errado

Em `ComprasRealizadas.tsx` (linha 292), o `mes_competencia` é salvo como `"Fevereiro/2026"`, mas no `ControleFinanceiro.tsx` o formato esperado é `"02"` (dois dígitos). Por isso a listbox "Mês Competência" não mostra seleção ao abrir o lançamento criado automaticamente.

**Correção em `src/pages/ComprasRealizadas.tsx`:**
- Linha 292: mudar de `const mesCompetencia = \`${meses[dataCompra.getMonth()]}/${ano}\`;` para simplesmente `const mesCompetencia = mes;` (que já é `String(dataCompra.getMonth() + 1).padStart(2, "0")` na linha 290).
- Linha 313: usar `mesCompetencia` (que agora será `"02"` em vez de `"Fevereiro/2026"`).
- Remover o array `meses` local (linhas 291) que não será mais necessário.

### Problema 2: Formas de Pagamento não persistidas

O state `prazosPagamento` é local (`useState`), então ao recarregar a página as opções se perdem. Precisamos criar uma tabela no banco para armazená-las.

**Migração SQL:**
```sql
CREATE TABLE public.formas_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dias integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own formas_pagamento"
  ON public.formas_pagamento FOR ALL
  TO public
  USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));
```

**Alterações em `src/pages/ComprasRealizadas.tsx`:**

1. **Carregar formas de pagamento do banco** ao montar o componente (`loadFormasPagamento`): query `formas_pagamento` filtrando por `user_id = ownerId`, ordenado por `dias ASC`. Popular `prazosPagamento` com os valores retornados.

2. **Salvar formas de pagamento no banco** quando o usuário clica "Salvar" no modal: deletar registros existentes do usuário e inserir os novos valores. Após salvar, recarregar do banco.

3. **Inicializar `prazosPagamento`** como `[]` (vazio) em vez de `[""]`, e ao abrir o modal, se estiver vazio, adicionar um campo vazio para o usuário começar a preencher.

