

## Plano: Novos campos no formulário "Nova Compra (NF)" + criação automática de lançamento financeiro

### 1. Atualizar interface `Fornecedor` para incluir campos de busca

Expandir a interface para incluir `cnpj_cpf` e `nome_fantasia`, e atualizar a query `loadFornecedores` para buscar esses campos adicionais.

### 2. Substituir Select de Fornecedor por Combobox com busca (lupa)

Trocar o `<Select>` do campo "Fornecedor" por um `<Popover>` + `<Command>` (igual ao produto), permitindo busca por razão social, nome fantasia ou CPF/CNPJ.

### 3. Adicionar campo "Dias de Pagamento" (listbox com busca)

- Posicionar entre "Data da Emissão da NFe" e "Valor Total" (mudar grid de 2 para 3 colunas nessa linha)
- Usar Popover + Command com campo de busca
- Primeira opção: "À Vista"
- Demais opções: prazos cadastrados no modal "Formas de Pagamento" (state `prazosPagamento`), formatados como "30", "30/60", "30/60/90" etc., em ordem crescente
- Novo state: `diasPagamentoSelecionado`

### 4. Adicionar linha com "Descrição 1 *" e "Descrição 2 *"

- Nova linha abaixo de "Data da Emissão da NFe / Dias de Pagamento / Valor Total"
- Grid 2 colunas: Descrição 1 e Descrição 2
- Usar as mesmas constantes do `ControleFinanceiro.tsx` — extrair `categoriasDescricao1` e `categoriasDescricao2` para um arquivo compartilhado (ex: `src/constants/categorias.ts`) e importar em ambas as páginas
- Como no formulário de compra o tipo é sempre "Despesa", a Descrição 1 mostrará apenas as opções de Despesa: "Despesa Fixa", "Despesa Operacional", "Despesa Não Operacional"
- Descrição 2 fica desabilitada até Descrição 1 ser selecionada, carregando as subcategorias correspondentes (mesma regra condicional do Controle Financeiro)
- Novos states: `descricao1` e `descricao2` no formData
- Ambos obrigatórios — validar antes de salvar

### 5. Atualizar `calcularValorTotal` para considerar quantidade × valor

Atualmente soma apenas `valor_compra`. Precisa multiplicar `quantidade × valor_compra` por item.

### 6. Criação automática de lançamento financeiro ao salvar

Ao salvar a compra com sucesso, criar lançamento(s) financeiro(s) na tabela `lancamentos_financeiros` + `lancamentos_financeiros_itens`:

- Se "À Vista": criar 1 lançamento com `data_pagamento = data_compra`
- Se prazo (ex: "30/60/90"): criar N lançamentos, um para cada prazo, com `data_pagamento = data_compra + X dias`. O valor de cada lançamento será `valorTotal / N` (dividido igualmente entre as parcelas).

Campos de cada lançamento:
- `user_id`: ownerId
- `ano`: ano da data_compra
- `mes_competencia`: mês da data_compra
- `tipo`: "Despesa"
- `descricao1`: valor selecionado
- `fornecedor_id`: fornecedor selecionado
- `valor_total`: valorTotal (ou valorTotal/N se parcelado)
- `data_pagamento`: calculada
- `conta_id`: null
- `pago`: false

Item do lançamento:
- `descricao2`: valor selecionado
- `produto_servico`: null ou descrição genérica
- `valor`: mesmo do lançamento
- `quantidade`: 1

### 7. Atualizar `resetForm` para limpar os novos campos

### Arquivos alterados:
- **Novo**: `src/constants/categorias.ts` — exportar `categoriasDescricao1` e `categoriasDescricao2`
- **`src/pages/ControleFinanceiro.tsx`** — importar categorias do arquivo compartilhado (remover as constantes locais)
- **`src/pages/ComprasRealizadas.tsx`** — todas as mudanças de UI e lógica descritas acima

