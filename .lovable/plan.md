

## Correção: Sincronização bidirecional entre "Horário de Fim" e "Tempo de Serviço"

### Causa raiz

O componente `TimeInput` (usado nos campos "Horário de Início" e "Horário de Fim") usa `useState(value)` na linha 13, que só captura o valor inicial. Quando o pai atualiza a prop `value` (ex: ao preencher "Tempo de Serviço" e recalcular o "Horário de Fim"), o `displayValue` interno do `TimeInput` **não é atualizado**, então o campo aparece vazio.

O caminho inverso funciona porque o campo "Tempo de Serviço" é um `<Input>` nativo que usa `formData.tempoServico` diretamente, sem estado interno.

### Correção

**Arquivo:** `src/components/TimeInput.tsx`

Adicionar um `useEffect` para sincronizar `displayValue` quando a prop `value` muda externamente:

```tsx
import { useState, useEffect } from "react";

// Dentro do componente:
useEffect(() => {
  setDisplayValue(value);
}, [value]);
```

Isso é tudo. Essa correção única resolve o problema em **todos os formulários** (Novo Agendamento, Editar Agendamento gerenciamento, Editar Agendamento calendário) porque todos usam o mesmo componente `TimeInput`.

