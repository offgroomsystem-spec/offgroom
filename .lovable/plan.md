

## Correções no formulário de Novo Agendamento

### Problema 1: "Horário de Fim" não atualiza ao preencher "Tempo de Serviço"

**Causa**: O campo "Tempo de Serviço" usa um `Input` com formatação manual. Quando o usuário digita apenas 1 dígito (ex: "1"), o valor fica sem ":" e a função `calcularHorarioTermino` tenta fazer `split(":")` e obtém `NaN`, retornando string vazia. Com 2 dígitos (ex: "13" → "1:3"), funciona mas dá resultado intermediário incorreto. O cálculo só funciona corretamente com 3 dígitos (ex: "130" → "1:30").

**Solução**: Adicionar validação na função `calcularHorarioTermino` para tratar valores sem ":" (interpretar como minutos ou horas conforme o caso) e garantir que o cálculo aconteça mesmo com valores parciais. Também adicionar proteção contra NaN no resultado.

### Problema 2: Campos não limpam ao fechar o dialog sem "Cancelar"

**Causa**: O `Dialog` usa `onOpenChange={setIsDialogOpen}` que apenas fecha o dialog sem resetar o `formData`.

**Solução**: Alterar o `onOpenChange` do Dialog de "Novo Agendamento" (linha 2055) para resetar todos os campos do `formData` quando o dialog fecha.

### Alterações no `src/pages/Agendamentos.tsx`

1. **Linha ~2055**: Mudar `onOpenChange={setIsDialogOpen}` para uma função que reseta o `formData` ao fechar:
```tsx
onOpenChange={(open) => {
  setIsDialogOpen(open);
  if (!open) {
    setFormData({ cliente: "", pet: "", raca: "", whatsapp: "", servico: "", data: "", horario: "", tempoServico: "", horarioTermino: "", dataVenda: "", numeroServicoPacote: "", groomer: "", taxiDog: "" });
  }
}}
```

2. **Linha ~1213**: Melhorar `calcularHorarioTermino` para tratar tempo sem `:` e proteger contra NaN:
```tsx
const calcularHorarioTermino = (inicio: string, tempo: string): string => {
  if (!inicio || !tempo) return "";
  if (!inicio.includes(":") || !tempo.includes(":")) return "";
  const [inicioH, inicioM] = inicio.split(":").map(Number);
  const [tempoH, tempoM] = tempo.split(":").map(Number);
  if (isNaN(inicioH) || isNaN(inicioM) || isNaN(tempoH) || isNaN(tempoM)) return "";
  // ... resto igual
};
```

3. **Aplicar mesma lógica nos 3 formulários** (Novo Agendamento, Editar Gerenciamento, Editar Calendário) para garantir consistência.

