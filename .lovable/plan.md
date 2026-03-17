

## Adicionar calendário ao campo "Dia Agendamento*" com duplo clique

O campo atual usa `<Input type="date">` nativo do browser, que em alguns navegadores não exibe um calendário visual intuitivo. A solução é substituir por um componente Popover + Calendar (shadcn) que abre ao clicar duas vezes no campo.

### Abordagem

Substituir o `<Input type="date">` na linha 2193 por um `Popover` com `Calendar` do shadcn, ativado por duplo clique (`onDoubleClick`). O campo continuará exibindo a data formatada e permitirá digitação manual, mas ao dar duplo clique abrirá o calendário visual.

**Implementação**: Usar um estado `calendarOpen` para controlar o Popover. O `PopoverTrigger` envolve o Input existente com `onDoubleClick` para abrir. O `PopoverContent` contém o `Calendar` com `pointer-events-auto`.

### Escopo — todos os campos de data relevantes

Aplicar a mesma lógica nos seguintes campos de data:
1. **Novo Agendamento** — "Dia Agendamento*" (linha ~2193)
2. **Editar Agendamento (gerenciamento)** — "Data do Agendamento" (linha ~2937)
3. **Editar Agendamento (calendário)** — "Data" (linha ~3789)

Os demais campos de data (dataVenda, filtros) permanecem como estão, a menos que o usuário peça.

### Detalhes técnicos
- Importar `format, parse` de `date-fns` e `ptBR` locale
- Adicionar estado `calendarOpen` (boolean)
- O Input mantém `type="text"` com máscara de data ou `type="date"` com o Popover ao lado
- Ao selecionar data no Calendar, atualizar `formData.data` no formato `YYYY-MM-DD` e fechar o Popover
- Converter entre `Date` e string `YYYY-MM-DD` para compatibilidade

