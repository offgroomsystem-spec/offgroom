

## Ajustes nos campos de horário da tela de Agendamento

### Resumo
Adicionar campo "Horário de Fim do Serviço" entre "Horário de Início" e "Tempo de Serviço", com cálculo automático bidirecional. Aplicar em 3 formulários: Novo Agendamento, Editar Agendamento (gerenciamento) e Editar Agendamento (calendário).

### Alterações no `src/pages/Agendamentos.tsx`

#### 1. Nova função `calcularTempoServico`
Inversa da `calcularHorarioTermino`: recebe horário de início e horário de fim, retorna o tempo de serviço no formato `h:mm`.

#### 2. Formulário "Novo Agendamento" (linhas ~2153-2278)
- Mudar grid de `grid-cols-2` para `grid-cols-4` com tamanhos compactos
- Colocar os 4 campos na mesma linha: Data, Início, Fim, Tempo
- O campo "Horário de Fim do Serviço" será um `TimeInput` editável (não mais `readOnly` e `hidden`)
- Ao preencher "Tempo de Serviço": calcular automaticamente "Horário de Fim" via `calcularHorarioTermino`
- Ao preencher "Horário de Fim": calcular automaticamente "Tempo de Serviço" via `calcularTempoServico`
- Ao alterar "Horário de Início": recalcular "Horário de Fim" se "Tempo de Serviço" estiver preenchido

#### 3. Validação do submit (linha ~1040)
- Mudar validação: exigir `formData.horario` + pelo menos um entre `formData.tempoServico` ou `formData.horarioTermino`

#### 4. Formulário "Editar Agendamento" - Gerenciamento (linhas ~2919-2978)
- Reorganizar para 4 campos na mesma linha (Data, Início, Fim, Tempo)
- Tornar "Horário de Término" editável com a mesma lógica bidirecional
- Ao preencher Fim: calcular Tempo; ao preencher Tempo: calcular Fim

#### 5. Formulário "Editar Agendamento" - Calendário (linhas ~3780-3808)
- Adicionar campo "Horário de Fim" entre Início e Tempo
- Mesma lógica bidirecional de cálculo automático

#### 6. Lógica de salvamento
- Garantir que `horarioTermino` seja calculado/persistido corretamente em ambos os fluxos (simples e pacote)

