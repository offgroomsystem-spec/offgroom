

## Adicionar filtro "Fornecedor" com busca na area de filtros do Fluxo de Caixa

### O que sera feito

Adicionar um campo de filtro "Fornecedor" com busca inteligente (por nome, CPF/CNPJ ou nome fantasia) na area de "Filtros de Categoria" do Fluxo de Caixa, posicionado a esquerda do campo "Nome do Pet".

### Alteracoes

**Arquivo: `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`**

1. **Estado `filtros`** (linha 456): Adicionar campo `nomeFornecedor: ""` ao objeto de estado inicial.

2. **Funcao `limparFiltros`** (linha 731): Adicionar `nomeFornecedor: ""` ao reset.

3. **Logica de filtragem `lancamentosFiltrados`** (apos linha 807): Adicionar filtro por fornecedor:
   ```
   if (filtros.nomeFornecedor) {
     resultado = resultado.filter((l) => l.nomeFornecedor === filtros.nomeFornecedor);
   }
   ```

4. **Lista de opcoes de fornecedores para filtro**: Criar um `useMemo` que gera as opcoes no formato `{ value, label }` a partir do array `fornecedores` ja carregado, incluindo nome e CPF/CNPJ no label para facilitar a busca.

5. **Campo no JSX** (linha 2703, grid de filtros): Inserir um novo `ComboboxField` antes do campo "Nome do Pet", com:
   - Label: "Fornecedor"
   - Placeholder: "Selecione"
   - searchPlaceholder: "Buscar por nome ou CPF/CNPJ..."
   - Opcoes geradas a partir dos fornecedores cadastrados
   - Busca pelo nome, CPF/CNPJ e nome fantasia

6. **Grid**: Alterar de `grid-cols-2 md:grid-cols-4` para `grid-cols-2 md:grid-cols-4 lg:grid-cols-5` ou manter 4 colunas com o campo extra quebrando para proxima linha, dependendo do espaco disponivel.

### Detalhes tecnicos

- O componente ja possui `fornecedores` carregado com `id`, `nome_fornecedor`, `cnpj_cpf` e `nome_fantasia`
- O `ComboboxField` ja e usado para Pet e Cliente nos filtros, entao seguira o mesmo padrao
- A filtragem comparara `lancamento.nomeFornecedor` com o valor selecionado no filtro
- O `ComboboxField` usa internamente o `cmdk` que ja suporta busca por texto, entao incluir CPF/CNPJ no label da opcao permitira busca por documento automaticamente

