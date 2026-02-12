

# Adicionar coluna "Fornecedor" na tabela de Lancamentos do Controle Financeiro

## Resumo

Incluir uma nova coluna "Fornecedor" a esquerda da coluna "Cliente" na tabela de lancamentos da pagina Controle Financeiro (`src/pages/ControleFinanceiro.tsx`), puxando o nome do fornecedor a partir do `fornecedor_id` ja existente nos dados. Ajustar espacamento para manter legibilidade.

## Arquivo: `src/pages/ControleFinanceiro.tsx`

### 1. Adicionar `nomeFornecedor` na interface `LancamentoFinanceiro` (linha 70)

Incluir `nomeFornecedor: string;` na interface, ao lado dos outros campos de nome.

### 2. Mapear nome do fornecedor no carregamento de dados (linhas 460-502)

- Adicionar `nomeFornecedor: ""` no objeto do lancamento formatado (linha ~455)
- Buscar fornecedores do banco: `supabase.from("fornecedores").select("id, nome_fornecedor").eq("user_id", ownerId)`
- Criar `fornecedoresMap` e preencher `l.nomeFornecedor = fornecedoresMap.get(lancOriginal.fornecedor_id) || ""`

### 3. Adicionar coluna no cabecalho da tabela (entre linhas 2212 e 2213)

Inserir `<th>Fornecedor</th>` entre a coluna "Tipo" e "Cliente", com as mesmas classes de estilo (`text-left py-2 px-1 font-semibold text-xs`).

### 4. Adicionar celula no corpo da tabela (entre linhas 2251 e 2252)

Inserir celula com `lancamento.nomeFornecedor || "-"`, aplicando `truncate` e `max-w-[100px]` para abreviar nomes longos.

### 5. Ajustar espacamento das colunas

- Reduzir padding horizontal de `px-2` para `px-1` em todas as celulas do cabecalho e corpo
- Reduzir largura maxima da coluna "Itens" aplicando `max-w-[150px] truncate`
- Atualizar `colSpan` da mensagem "Nenhum lancamento" de 12 para 13

## Detalhes Tecnicos

| Aspecto | Detalhe |
|---------|---------|
| Arquivo | `src/pages/ControleFinanceiro.tsx` |
| Banco de dados | Nenhuma alteracao (fornecedor_id ja existe) |
| Tabela consultada | `fornecedores` (campo `nome_fornecedor`) |
| Posicao da coluna | Entre "Tipo" e "Cliente" |
| Abreviacao | Nome do fornecedor truncado com max-w-[100px], coluna Itens com max-w-[150px] |

