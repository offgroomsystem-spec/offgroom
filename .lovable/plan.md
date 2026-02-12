
# Adicionar coluna "Fornecedor" na tabela de Lancamentos Financeiros

## Resumo

Incluir uma nova coluna "Fornecedor" a esquerda da coluna "Cliente" na tabela de lancamentos do Fluxo de Caixa, buscando o nome do fornecedor a partir do `fornecedor_id` ja existente na tabela `lancamentos_financeiros`. Ajustar o espacamento das colunas para manter boa legibilidade.

## Arquivo modificado: `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`

### 1. Buscar dados de fornecedores no `loadLancamentos`

Na funcao `loadLancamentos` (linha ~477), adicionar uma query para buscar fornecedores:
```
const fornecedoresData = await supabase.from("fornecedores").select("id, nome_fornecedor").eq("user_id", ownerId);
```

Criar um `fornecedoresMap` e mapear `fornecedor_id` para `nomeFornecedor` em cada lancamento formatado (similar ao que ja e feito com `clientesMap` e `contasMap`).

### 2. Adicionar campo `nomeFornecedor` no objeto do lancamento

No mapeamento inicial (linha ~452), adicionar `nomeFornecedor: ""` ao objeto. Na iteracao de mapeamento (linha ~492), preencher com:
```
l.nomeFornecedor = fornecedoresMap.get(lancOriginal.fornecedor_id) || "";
```

### 3. Adicionar coluna no cabecalho da tabela

Inserir `<th>Fornecedor</th>` entre a coluna "Tipo" e "Cliente" (entre linhas 1597 e 1598).

### 4. Adicionar celula no corpo da tabela

Inserir `<td>` com `lancamento.nomeFornecedor || "-"` entre a celula de Tipo e Cliente. Aplicar `truncate` e `max-w-[100px]` para abreviar nomes longos.

### 5. Ajustar espacamento das colunas

- Reduzir padding de `px-2` para `px-1` em todas as colunas
- Reduzir `max-w` da coluna "Itens" de `200px` para `150px`
- Atualizar `colSpan` da mensagem "Nenhum lancamento" de 12 para 13

### 6. Incluir Fornecedor na exportacao

No `dadosExportacao` (linha ~1078), adicionar campo "Fornecedor" com `l.nomeFornecedor || "-"`.

## Detalhes Tecnicos

| Aspecto | Detalhe |
|---------|---------|
| Arquivo | `src/components/relatorios/financeiros/FluxoDeCaixa.tsx` |
| Banco de dados | Nenhuma alteracao (fornecedor_id ja existe) |
| Tabela consultada | `fornecedores` (campo `nome_fornecedor`) |
| Posicao da coluna | Entre "Tipo" e "Cliente" |
| Abreviacao | Nome do fornecedor truncado com max-w-[100px], coluna Itens reduzida para max-w-[150px] |
