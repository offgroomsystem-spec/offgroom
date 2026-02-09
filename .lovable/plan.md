

# Correção: Botão Editar do Fornecedor

## Problema Identificado

A função `handleEdit` (linha 264) preenche os campos do formulário e define o `editingId`, mas **não abre o modal de edição**. Falta a chamada `setFormDialogOpen(true)`. Em vez disso, ela apenas rola a página para o topo (`window.scrollTo`), comportamento antigo de quando o formulário era inline.

## Correção

No arquivo `src/pages/Fornecedores.tsx`, na função `handleEdit` (linhas 264-289):

- Adicionar `setFormDialogOpen(true)` para abrir o modal com os dados preenchidos
- Remover o `window.scrollTo({ top: 0, behavior: "smooth" })` que não faz mais sentido com modal flutuante

Resultado da função corrigida:

```typescript
const handleEdit = (fornecedor: Fornecedor) => {
  setFormData({
    nome_fornecedor: fornecedor.nome_fornecedor,
    // ... todos os campos mantidos
  });
  setEditingId(fornecedor.id);
  setFormDialogOpen(true); // <-- linha adicionada
  // window.scrollTo removido
};
```

## Impacto

- O modal de cadastro (que ja existe e funciona para "Novo Fornecedor") sera reutilizado para edição
- O titulo do modal ja alterna entre "Novo Fornecedor" e "Editar Fornecedor" com base no `editingId`
- Todos os campos ficarao editaveis, como ja ocorre no formulario atual
- Nenhuma alteracao estrutural necessaria, apenas 1 linha adicionada e 1 removida

