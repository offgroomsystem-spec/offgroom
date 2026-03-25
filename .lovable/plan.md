

## Plano: Adicionar coluna CPF/CNPJ na tabela de Clientes

### Alteracao

**Arquivo: `src/pages/Clientes.tsx`**

1. **Header (linha 641-642)**: Adicionar `<th>CPF/CNPJ</th>` entre "Endereco" e "Acoes"

2. **Body (linha 666-667)**: Adicionar `<td>` entre a celula de endereco e a de acoes, exibindo `cliente.cpf_cnpj || "-"` com formatacao via `formatCPFCNPJ` do `fiscalUtils.ts` (quando houver valor)

O campo `cpf_cnpj` ja existe na tabela `clientes` do banco de dados e ja e carregado nas queries existentes.

