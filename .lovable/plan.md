

## Adicionar campo "Sexo" ao cadastro de pets

### Alterações necessárias

**1. Migration - Nova coluna na tabela `pets`**
- Adicionar coluna `sexo` (text, nullable, default null) na tabela `pets`
- Nullable para não quebrar pets já cadastrados

**2. Arquivo: `src/pages/Clientes.tsx`**

- Atualizar interface `Pet` — adicionar `sexo: string`
- Atualizar estado inicial em `useState`, `resetForm`, `addPet`, e `startEditing` — incluir `sexo: ""`
- Atualizar validação (`handleSubmit`) — exigir `pet.sexo` preenchido
- Atualizar INSERT e UPDATE de pets — incluir campo `sexo`
- Adicionar novo Select "Sexo *" no formulário, após o campo "Porte", com opções "Macho" e "Fêmea"
- Reorganizar o grid de campos para acomodar o novo campo (grid-cols-3 ou adicionar nova linha)

