

## Plano: Botao de ordenar por CPF/CNPJ na tabela de Clientes

### Alteracoes

**Arquivo: `src/pages/Clientes.tsx`**

1. **Novo state**: Adicionar `const [ordenarCpf, setOrdenarCpf] = useState(false)` para controlar se a ordenacao esta ativa.

2. **Logica de ordenacao**: Apos o `filteredClientes`, criar `sortedClientes` que, quando `ordenarCpf` for `true`, ordena pelo campo `cpf_cnpj` numericamente (removendo pontuacao) do menor para o maior, colocando clientes sem CPF/CNPJ no final.

3. **Header CPF/CNPJ (linha 643)**: Substituir o texto simples por um botao com icone `ArrowUpDown` (do lucide-react) ao lado do titulo, que alterna `ordenarCpf` entre `true` e `false`.

4. **Renderizacao (linha 648)**: Trocar `filteredClientes.map` por `sortedClientes.map`.

5. **ColSpan**: Atualizar o `colSpan` da linha "Nenhum cliente encontrado" de 5 para 6.

