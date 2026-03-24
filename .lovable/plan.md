

## Plano: Reorganizar Layout do Toggle Dedução/Juros

### O que muda
Colocar o toggle e todos os campos (valor, tipo/motivo, valor total) na **mesma linha horizontal**, com o toggle à esquerda e os campos ao lado direito. Reduzir a largura do input de valor.

### Layout atual
```text
[Toggle Dedução | Juros]
[Valor da Dedução] [Tipo de Dedução] [Valor Total: R$ X]
```

### Layout novo
```text
[Toggle] [Valor (menor)] [Tipo/Motivo] [Valor Total: R$ X]
```

Tudo em uma única linha usando `flex items-center gap-2`.

### Alterações em 4 blocos (mesmo padrão em todos)

**Arquivos:**
- `src/pages/ControleFinanceiro.tsx` — formulário Lançar (~linha 2131) e Editar (~linha 3209)
- `src/components/relatorios/financeiros/FluxoDeCaixa.tsx` — formulário Lançar (~linha 2107) e Editar (~linha 3447)

**Em cada bloco:**
1. Remover a div separada do toggle (`mb-2`) e o `grid grid-cols-3`
2. Substituir por um único `flex items-center gap-2` contendo:
   - O toggle (inline-flex, como está)
   - Input de valor com largura reduzida (`w-24` ou `max-w-[100px]`)
   - Select de tipo/motivo com largura adequada (`w-36`)
   - Valor Total à direita

