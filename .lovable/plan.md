

## Adicionar campo "Quantidade" para itens não-Venda

### Contexto
Atualmente, o campo "Qtd" só aparece quando `isVenda === true`. Para os demais tipos (Despesas, etc.), a quantidade é assumida como 1. O usuário quer um campo "Quantidade" visível em todos os cenários.

### Alterações em `src/pages/ControleFinanceiro.tsx` — `ItemLancamentoForm`

**Layout atual (não-Venda):** Descrição 2 (4) + Observação (4) + Valor (2) + Total (2) = 12

**Layout novo (não-Venda):** Descrição 2 (3) + Observação (3) + Quantidade (1) + Valor (2) + Total (3) = 12

1. **Ajustar col-spans dos campos Descrição 2 e Observação** quando NÃO é Venda: de `col-span-4` para `col-span-3`
2. **Remover a condição `{isVenda && ...}`** do campo Qtd — torná-lo sempre visível
3. **Alterar o label** de "Qtd *" para "Quantidade" (sem asterisco, já que terá valor padrão 1)
4. **Garantir `quantidade` inicializada com 1** — o campo já exibe `item.quantidade || ""`, ajustar para exibir o valor (que já é inicializado como 1 na criação do item). Verificar onde o item é criado para confirmar que `quantidade: 1` é o default.
5. **Campo Total** já calcula `item.valor * (item.quantidade || 1)` — nenhuma mudança necessária na fórmula

Preciso verificar onde os itens são inicializados para garantir que `quantidade: 1` é o default.

