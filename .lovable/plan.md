

## Adicionar botao "Lancar Financeiro" no Fluxo de Caixa

### O que sera feito

Adicionar o botao verde "Lancar Financeiro" na pagina de Relatorio do Fluxo de Caixa, posicionado a esquerda do botao "Transferencia de Saldo", com o mesmo formulario e regras que existem na pagina "/controle-financeiro".

### Alteracoes

**Arquivo: `src/components/relatorios/financeiros/FluxoDeCaixa.tsx`**

1. **Novo estado**: Adicionar `isCreateDialogOpen` para controlar o dialog de criacao.

2. **Funcao `handleCreateSubmit`**: Criar funcao identica ao `handleSubmit` do ControleFinanceiro, com as mesmas validacoes:
   - Ano, mes, tipo e descricao1 obrigatorios
   - Cliente/Pet obrigatorios apenas para Receita Operacional
   - Validacao de itens (descricao2 obrigatoria, valor > 0, produto/servico quando aplicavel)
   - Conta bancaria obrigatoria
   - Insercao no banco com os mesmos campos (user_id via ownerId, valor_deducao, tipo_deducao, fornecedor_id condicional)

3. **Atualizar `resetForm`**: Incluir `setIsCreateDialogOpen(false)` para fechar o dialog de criacao ao resetar.

4. **Botao + Dialog na barra de acoes**: Inserir o Dialog com o botao verde "Lancar Financeiro" antes do botao "Transferencia de Saldo", contendo o formulario completo:
   - Campos: Ano, Mes, Tipo, Descricao 1
   - Fornecedor (para Despesa) ou Cliente (para Receita) com busca inteligente
   - Pets com suporte a multiplos pets do mesmo cliente
   - Itens do lancamento (ate 10) com ItemLancamentoForm ja existente no componente
   - Deducoes (Tarifa Bancaria / Desconto)
   - Data pagamento, conta bancaria, status pago
   - Botoes Cancelar e Salvar Lancamento

### Ordem dos botoes na barra de acoes (da esquerda para direita)

1. Lancar Financeiro (novo, verde)
2. Transferencia de Saldo
3. Mostrar Filtros
4. Atualizar Saldo
5. Exportar PDF

### Detalhes tecnicos

O componente FluxoDeCaixa ja possui toda a infraestrutura necessaria:
- `formData`, `itensLancamento`, `setFormData`, `setItensLancamento`
- `clientes`, `pets`, `contas`, `servicos`, `pacotes`, `produtos`, `fornecedores`
- `clientesFormulario`, `petsFormulario`
- `fornecedorSearch`, `fornecedoresFiltrados`
- `ComboboxField`, `ItemLancamentoForm`
- `resetForm`, `loadLancamentos`, `formatCurrency`
- `ownerId` e `user` do `useAuth()`

A unica adicao necessaria e o estado `isCreateDialogOpen`, a funcao `handleCreateSubmit` e o bloco JSX do Dialog com o formulario de criacao.

