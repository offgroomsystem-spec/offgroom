

## Remover ícone nativo de calendário dos inputs de data com Popover

### Problema

Os inputs `type="date"` dentro de `PopoverTrigger` exibem o ícone nativo do browser para calendário. Ao clicar nesse ícone, abre o date picker nativo **e** o Popover customizado, resultando em dois calendários sobrepostos.

### Solução

Trocar `type="date"` para `type="text"` nos 3 inputs que estão dentro de `PopoverTrigger` (os que têm calendário custom via Popover). Os demais inputs `type="date"` que **não** possuem Popover permanecem inalterados.

### Alterações — `src/pages/Agendamentos.tsx`

1. **Linha ~2268** (Novo Agendamento - "Dia Agendamento"): `type="date"` → `type="text"`, adicionar `placeholder="aaaa-mm-dd"`
2. **Linha ~3034** (Editar Agendamento gerenciamento - "Data do Agendamento"): `type="date"` → `type="text"`, adicionar `placeholder="aaaa-mm-dd"`
3. **Linha ~3928** (Editar Agendamento calendário - "Data"): `type="date"` → `type="text"`, adicionar `placeholder="aaaa-mm-dd"`

Isso remove o ícone nativo do calendário, mantendo a funcionalidade de digitar a data manualmente e abrir o calendário custom via double-click.

