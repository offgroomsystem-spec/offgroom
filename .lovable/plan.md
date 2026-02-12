

# Corrigir formulario de Edicao para respeitar logica Despesa/Fornecedor

## Problema

No dialog "Editar Lancamento" do Fluxo de Caixa, quando o tipo e "Despesa", o formulario continua mostrando "Nome do Cliente" e "Pets" habilitados, em vez de exibir o campo "Fornecedor" e desabilitar "Pets" -- comportamento que ja funciona corretamente no "Controle Financeiro".

## Causa Raiz

O componente `FluxoDeCaixa.tsx` nao possui:
- Interface `Fornecedor` nem estado `fornecedores`
- Campo `fornecedorId` no `formData`
- Estado `fornecedorSearch` e memo `fornecedoresFiltrados` para busca inteligente
- Logica condicional no formulario de edicao (Fornecedor vs Cliente / Pets desabilitado)
- `fornecedor_id` no update do banco de dados
- Carregamento do `fornecedorId` ao abrir edicao

## Alteracoes em `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`

### 1. Adicionar interface Fornecedor e estado

Criar a interface `Fornecedor` (com `id`, `nome_fornecedor`, `cnpj_cpf`, `nome_fantasia`) identica ao ControleFinanceiro. Adicionar estado `fornecedores` e `fornecedorSearch`.

### 2. Adicionar `fornecedorId` ao `formData`

Incluir `fornecedorId: ""` no estado `formData` (linha ~422).

### 3. Carregar fornecedores no `loadRelatedData`

Na funcao `loadRelatedData` (linha ~530), adicionar query de fornecedores com campos completos (`id, nome_fornecedor, cnpj_cpf, nome_fantasia`) e popular o estado.

### 4. Criar memo `fornecedoresFiltrados`

Adicionar `useMemo` para filtrar fornecedores por nome, CNPJ/CPF ou nome fantasia, identico ao ControleFinanceiro.

### 5. Atualizar `abrirEdicao`

Na funcao `abrirEdicao` (linha 884), carregar o `fornecedorId` do lancamento original. Sera necessario armazenar o `fornecedor_id` no objeto `LancamentoFluxo` durante o `loadLancamentos`.

### 6. Modificar formulario de edicao (linhas 1797-1954)

Substituir o bloco fixo de "Nome do Cliente" + "Pets" pela logica condicional:

- **Se `formData.tipo === "Despesa"`**: Exibir campo "Fornecedor" com Popover/Command (busca inteligente por nome, CNPJ/CPF, nome fantasia) e campo "Pets" desabilitado com texto "Nao aplicavel"
- **Se Receita**: Manter comportamento atual (Nome do Cliente + Pets habilitados)

O layout e estilo serao identicos ao formulario do ControleFinanceiro (grid cols-2, mesmos espacamentos e tamanhos).

### 7. Atualizar `handleEditar`

Na funcao `handleEditar` (linha 956-971), incluir `fornecedor_id` no update:
```
fornecedor_id: formData.tipo === "Despesa" && formData.fornecedorId ? formData.fornecedorId : null,
```

### 8. Atualizar `onValueChange` do campo Tipo no form de edicao

Ao alterar o Tipo no formulario de edicao (linha 1759), limpar campos relacionados:
```
setFormData({ ...formData, tipo: value, descricao1: "", nomeCliente: "", nomePet: "", petsSelecionados: [], fornecedorId: "" })
```

### 9. Resetar `fornecedorId` no `resetForm`

Garantir que `fornecedorId` e `fornecedorSearch` sejam resetados quando o dialog fechar.

## Detalhes Tecnicos

| Aspecto | Detalhe |
|---------|---------|
| Arquivo | `src/components/relatorios/financeiros/FluxoDeCaixa.tsx` |
| Banco de dados | Nenhuma alteracao de schema (fornecedor_id ja existe na tabela) |
| Modelo visual | Identico ao ControleFinanceiro.tsx |
| Busca fornecedor | Por nome, CNPJ/CPF e nome fantasia (shouldFilter=false no Command) |
| Impacto | Apenas formulario de edicao; criacao nao existe neste componente |
