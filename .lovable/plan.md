

## Adicionar botão "Formas de Pagamento" com modal dinâmica

### Alterações em `src/pages/ComprasRealizadas.tsx`

**1. Novo state para controlar o modal e os prazos:**
- `formasPagamentoOpen` (boolean) — controla abertura do modal
- `prazosPagamento` (number[]) — array de dias, inicializado com `[null]` representando o primeiro campo

**2. Novo botão entre "Adicionar Compra (NF)" e o botão "Filtros":**
- Posicionado à direita do botão "Adicionar Compra (NF)" na div `flex gap-2` (linha 407)
- Mesmo estilo do botão "Filtros": `variant="outline"`, `size="sm"`, com ícone `CreditCard` do lucide-react
- Texto: "Formas de Pagamento"

**3. Modal (Dialog) "Formas de Pagamento":**
- Instrução no topo: "Adicione em cada campo a quantidade de dias após a emissão da NF em que cada parcela deverá ser paga."
- Lista dinâmica de inputs numéricos (type="number", `min=1`, bloqueia caracteres não numéricos via `onKeyDown`)
- Quando um campo tem valor, aparece botão "Adicionar mais dias para parcelamento" à direita
- Campos a partir do 2º têm botão "X" para remoção
- Botão "Salvar" no footer valida campos vazios e exibe toast de erro se houver algum vazio
- Ao salvar, armazena os prazos no state (por ora local, sem persistência em banco — pode ser integrado depois ao formulário de compra)

**4. Import adicional:** `CreditCard` do lucide-react (já importa outros ícones do mesmo pacote)

### Estrutura visual do modal

```text
┌─────────────────────────────────────────────┐
│  Formas de Pagamento                        │
│─────────────────────────────────────────────│
│  "Adicione em cada campo a quantidade..."   │
│                                             │
│  [ 30 ]  [+ Adicionar mais dias...]        │
│  [ 60 ]  [+ Adicionar mais dias...]  [X]   │
│  [ 90 ]  [+ Adicionar mais dias...]  [X]   │
│                                             │
│                          [Cancelar] [Salvar]│
└─────────────────────────────────────────────┘
```

