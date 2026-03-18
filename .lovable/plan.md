

## Corrigir seleção duplicada de serviços com mesmo nome

### Problema
O componente `cmdk` (Command) usa a prop `value` do `CommandItem` para identificar e destacar itens. Quando dois serviços têm o mesmo nome (ex: "Tosa Bebê"), ambos ficam grifados ao mesmo tempo porque compartilham o mesmo `value`.

### Solução
Alterar a prop `value` de cada `CommandItem` para incluir o `id` do serviço, tornando cada item único. Ajustar os handlers `onSelect` para extrair o `id` e localizar o serviço correto.

### Alterações — `src/pages/Agendamentos.tsx`

Nos **5 locais** onde `CommandItem` renderiza serviços, trocar:
```tsx
value={servico.nome}
```
por:
```tsx
value={`${servico.nome}__${servico.id}`}
```

E nos respectivos `onSelect`, em vez de buscar pelo nome:
```tsx
onSelect={(val) => {
  const id = val.split("__").pop();
  const found = servicos.find(s => s.id === id);
  // usar found...
}}
```

**Locais afetados:**
1. ~Linha 223 — Filtro de serviço no topo da página
2. ~Linha 2438 — Novo Agendamento (serviços filtrados por porte)
3. ~Linha 3217 — Editar Agendamento gerenciamento
4. ~Linha 3889 — Editar Agendamento calendário (serviços individuais)
5. ~Linha 3915 — Editar Agendamento calendário (pacotes)

