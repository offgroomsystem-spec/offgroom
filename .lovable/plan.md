

## Adicionar "Para todos os portes" na página de Serviços e ajustar filtro de agendamentos

### Alterações

**1. `src/pages/Servicos.tsx`** — Adicionar opção no Select de porte

- No formulário (novo/editar serviço), adicionar `<SelectItem value="Todos">Para todos os portes</SelectItem>` junto com Pequeno, Médio, Grande
- No filtro da lista, também adicionar essa opção

**2. `src/pages/Agendamentos.tsx`** — Ajustar `servicosFiltradosPorPorte`

- Na linha ~543, alterar o filtro para incluir serviços cujo porte normalizado seja `"todos"`, além dos que correspondem ao porte do pet:
```tsx
return servicos.filter(
  (s) => normalizarPorte(s.porte) === porteNormalizado || normalizarPorte(s.porte) === "todos"
);
```

Isso cobre automaticamente Novo Agendamento e Editar Agendamento, pois ambos usam a mesma lista `servicosFiltradosPorPorte` ou a lista completa `servicos`.

