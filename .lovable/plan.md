

# Adicionar Filtro de Fornecedor no Controle Financeiro

## Resumo

Adicionar um campo "Fornecedor" na area de filtros do Controle Financeiro, com busca inteligente por Nome do Fornecedor, CNPJ/CPF ou Nome Fantasia, seguindo o mesmo padrao do seletor de fornecedor que ja existe no formulario de lancamento.

---

## Alteracoes no arquivo `src/pages/ControleFinanceiro.tsx`

### 1. Estado dos filtros (linha ~649)

Adicionar o campo `fornecedorId` ao objeto `filtros`:

```typescript
const [filtros, setFiltros] = useState({
  // ... campos existentes
  fornecedorId: "",  // novo campo
});
```

### 2. Estado de busca do filtro

Adicionar um novo estado `filtroFornecedorSearch` para controlar a digitacao no campo de busca do filtro (separado do `fornecedorSearch` usado no formulario).

### 3. Memo de fornecedores filtrados para o filtro

Criar um `useMemo` similar ao `fornecedoresFiltrados` existente, mas usando `filtroFornecedorSearch` como termo de busca, filtrando por `nome_fornecedor`, `cnpj_cpf` e `nome_fantasia`.

### 4. Logica de filtragem (linha ~1125)

No `useMemo` de `lancamentosFiltrados`, adicionar verificacao:

```typescript
if (filtros.fornecedorId) {
  resultado = resultado.filter(
    (l) => l.fornecedorId === filtros.fornecedorId
  );
}
```

### 5. Limpar filtros (linha ~1106)

Adicionar `fornecedorId: ""` ao `limparFiltros`.

### 6. UI - Campo de filtro (apos linha ~2073, junto aos outros filtros de categoria)

Adicionar um novo campo na grid de filtros de categoria, usando `Popover` + `Command` com `shouldFilter={false}` (mesmo padrao do formulario), contendo:

- Icone de lupa (via `CommandInput`)
- Busca por nome, CNPJ/CPF ou nome fantasia
- Exibicao de cada opcao com nome + CNPJ/CPF + nome fantasia
- Selecao opcional

O campo ficara na mesma grid dos demais filtros de categoria.

### 7. Dependencias do useMemo

Adicionar `filtros.fornecedorId` as dependencias do `useMemo` de `lancamentosFiltrados` (ja esta coberto pelo `filtros` existente).

---

## Impacto

- Nenhuma alteracao de banco de dados necessaria (o campo `fornecedor_id` ja existe na tabela e ja e carregado nos lancamentos)
- Apenas alteracoes no arquivo `src/pages/ControleFinanceiro.tsx`
- Segue exatamente o mesmo padrao visual e de busca do seletor de fornecedor do formulario de lancamento
