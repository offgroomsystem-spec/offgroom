

## Validação: Horário de Fim não pode ser menor que Horário de Início

### O que será feito

Adicionar validação nos 3 pontos de salvamento para impedir que o "Horário de Fim" seja anterior ao "Horário de Início", exibindo `toast.error` com mensagem de alerta.

### Locais de alteração — `src/pages/Agendamentos.tsx`

1. **`handleSubmit`** (linha ~1044): Após as validações existentes, antes de prosseguir com o insert, adicionar:
```tsx
const horarioTerminoFinal = formData.horarioTermino || calcularHorarioTermino(formData.horario, formData.tempoServico);
if (horarioTerminoFinal && formData.horario && horarioTerminoFinal <= formData.horario) {
  toast.error("O Horário de Fim não pode ser igual ou anterior ao Horário de Início. Por favor, corrija.");
  return;
}
```

2. **`handleAtualizarAgendamento`** (linha ~1897): No início da função, após o guard clause, adicionar a mesma validação usando `editandoAgendamento.horarioInicio` e `editandoAgendamento.horarioTermino`.

3. **Botão "Atualizar Agendamento" do calendário** (linha ~3958): Dentro do `onClick`, antes de atualizar o estado, adicionar a validação usando `editFormData.horarioInicio` e `editFormData.horarioTermino`.

### Lógica da validação

Comparação simples de strings no formato `HH:MM` (funciona porque são zero-padded). Se `horarioTermino <= horarioInicio`, bloqueia o salvamento e exibe toast de erro.

