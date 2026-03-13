

## Alterar Input de Formas de Pagamento para Campos Individuais por Parcela

### Conceito

Em vez de um único campo de texto onde o usuário digita "30/60", cada condição de pagamento será composta por **múltiplos campos numéricos individuais** (um por parcela). O primeiro campo aceita apenas dígitos (ex: "30"), e ao preenchê-lo, aparece um botão "+" para adicionar outra parcela (ex: "60"). O resultado salvo no banco será a concatenação com "/" — ex: "30/60".

### Alterações em `src/pages/ComprasRealizadas.tsx`

**1. Alterar o state `novosPrazos`:**
- De `string[]` (lista de condições completas) para `string[][]` — cada condição é um array de parcelas individuais
- Inicializar como `[[""]`] (uma condição com uma parcela vazia)
- No reset ao abrir o modal: `setNovosPrazos([[""]])`

**2. Refatorar o UI do modal (linhas ~1240-1282):**
- Loop externo: cada condição (índice `i`)
- Loop interno: cada parcela da condição (índice `j`)
  - Input `type="text"` que aceita apenas dígitos (`value.replace(/\D/g, "")`)
  - Placeholder: "Ex: 30"
  - Entre cada campo de parcela, exibir um separador visual "/" 
  - Botão "+" ao lado da última parcela para adicionar mais uma parcela àquela condição
  - Botão "X" para remover parcelas extras (quando há mais de uma)

**3. Refatorar `salvarFormasPagamento` (linhas ~163-200):**
- Converter cada `string[]` em uma string concatenada com "/" — ex: `["30", "60"]` → `"30/60"`
- Filtrar parcelas vazias dentro de cada condição
- Manter a mesma lógica de duplicidade, agora comparando as strings resultantes

**4. Validação:**
- Cada campo aceita apenas dígitos (sem "/" no input)
- Não permitir parcelas vazias no meio de uma condição

