

# Unificar "Reparos" em "Manutencao" na Descricao 2

## Resumo

Atualizar todos os lancamentos financeiros que possuem "Reparos" na Descricao 2 para "Manutencao" e remover "Reparos" da lista de opcoes em todo o sistema.

## Etapa 1 -- Atualizar dados existentes no banco

Executar um UPDATE na tabela `lancamentos_financeiros_itens` para alterar todos os registros com `descricao2 = 'Reparos'` para `descricao2 = 'Manutencao'`. Isso afeta todos os usuarios de uma vez, sem alterar nenhum outro campo.

```sql
UPDATE lancamentos_financeiros_itens
SET descricao2 = 'Manutenção'
WHERE descricao2 = 'Reparos';
```

## Etapa 2 -- Remover "Reparos" das listas de opcoes no codigo

### Arquivo: `src/pages/ControleFinanceiro.tsx`
- Remover `"Reparos"` do array de `categoriasDescricao2["Despesa Nao Operacional"]` (linha 141)

### Arquivo: `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`
- Remover `"Reparos"` do array de `categoriasDescricao2["Despesa Nao Operacional"]` (linha 161)

### Arquivo: `src/components/relatorios/financeiros/DespesasNaoOperacionais.tsx`
- Remover `"Reparos"` do array de categorias usado nos calculos (linha 244)
- Remover `"Reparos"` do filtro `.includes()` para calculo de `manutencaoReparos` (linha 226) -- manter apenas `"Manutencao"`
- Remover o `<SelectItem value="Reparos">` do filtro de categorias (linha 570)
- Remover o `<SelectItem value="Reparos">` do formulario de edicao (linha 1014)
- Atualizar o titulo do card KPI de "Manutencao + Reparos" para "Manutencao" (linha 667)
- Atualizar os textos descritivos que mencionam "reparos" (linhas 675, 507)

### Arquivo: `src/pages/Relatorios.tsx`
- Atualizar o texto descritivo do relatorio de Despesas Nao Operacionais que menciona "reparos" (linha 201)

## Resultado

- Todos os lancamentos existentes com "Reparos" serao convertidos para "Manutencao"
- A opcao "Reparos" deixara de existir em todos os formularios e filtros
- Nenhum outro dado dos lancamentos sera alterado

