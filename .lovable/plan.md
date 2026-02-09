
# Ajuste: Trocar "Nome do Cliente" por "Fornecedor" quando Tipo = Despesa

## Resumo

Quando o usuario selecionar "Despesa" no campo Tipo, o campo "Nome do Cliente" sera substituido por um campo "Fornecedor" com busca inteligente por nome, CNPJ/CPF ou nome fantasia. A selecao e opcional.

---

## 1. Migracaoo de Banco de Dados

Adicionar coluna `fornecedor_id` na tabela `lancamentos_financeiros`:

```sql
ALTER TABLE lancamentos_financeiros 
ADD COLUMN fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL;
```

Essa coluna sera opcional (nullable) e armazenara o fornecedor vinculado a despesas.

---

## 2. Alteracoes em `src/pages/ControleFinanceiro.tsx`

### 2.1 Estado e Interface

- Adicionar interface `Fornecedor` com campos: `id`, `nome_fornecedor`, `cnpj_cpf`, `nome_fantasia`
- Adicionar estado `fornecedores` (`useState<Fornecedor[]>`)
- Adicionar campo `fornecedorId` ao `formData` (string, inicialmente vazio)

### 2.2 Carga de Dados

- Na funcao `loadRelatedData`, adicionar fetch da tabela `fornecedores` (junto com os demais fetches em `Promise.all`)
- Na funcao `loadLancamentos`, carregar tambem o `fornecedor_id` e mapear para o nome do fornecedor

### 2.3 UI - Campo condicional (linhas ~1314-1352)

Substituir o bloco do campo "Nome do Cliente" por logica condicional:

- **Se tipo = "Despesa"**: Exibir um Combobox "Fornecedor (opcional)" que:
  - Busca na lista de fornecedores cadastrados
  - Filtra por `nome_fornecedor`, `cnpj_cpf` ou `nome_fantasia` conforme o usuario digita
  - Exibe cada opcao como: "Nome Fornecedor - CNPJ/CPF" para facilitar identificacao
  - Possui icone de lupa (ja presente no CommandInput)
  - A selecao e opcional (sem asterisco, sem validacao obrigatoria)
  
- **Se tipo != "Despesa"**: Manter o Combobox "Nome do Cliente" existente sem alteracoes

### 2.4 Salvamento (funcao de salvar, linhas ~826-847)

- Ao inserir/atualizar, incluir `fornecedor_id` no objeto enviado ao banco:
  - Se tipo = "Despesa" e fornecedor selecionado: enviar o ID do fornecedor
  - Caso contrario: enviar `null`

### 2.5 Edicao (funcao de editar)

- Ao carregar um lancamento para edicao, preencher o campo `fornecedorId` do formData se existir `fornecedor_id` no registro

### 2.6 Reset do formulario

- Ao trocar o tipo de "Receita" para "Despesa" (e vice-versa), limpar os campos mutuamente exclusivos (cliente/pet ou fornecedor)

---

## 3. Detalhes Tecnicos

| Aspecto | Detalhe |
|---------|---------|
| Componente de busca | Reutilizar o padrao `Popover` + `Command` ja existente (ComboboxField), mas com busca customizada que filtra por 3 campos |
| Filtragem | Usar `filter()` local comparando a busca com `nome_fornecedor`, `cnpj_cpf` e `nome_fantasia` (case-insensitive, parcial) |
| Campo Pet | Quando tipo = "Despesa", o campo Pet tambem permanece desabilitado (comportamento atual mantido) |
| Banco de dados | Uma unica migracao SQL adicionando a coluna `fornecedor_id` |

---

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Adicionar coluna `fornecedor_id` em `lancamentos_financeiros` |
| `src/pages/ControleFinanceiro.tsx` | Carregar fornecedores, campo condicional Cliente/Fornecedor, salvar `fornecedor_id` |
