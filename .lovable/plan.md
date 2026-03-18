

## Adicionar confirmação de atualização de horário no botão "Pet Pronto"

### O que será feito

Ao clicar no botão "Pet Pronto" (ícone fi-tr-comment-alt-check), em vez de abrir o WhatsApp imediatamente, será exibido um `AlertDialog` perguntando:

> "Deseja atualizar o horário do Fim do serviço para [HH:MM atual]?"

- **Sim**: Atualiza o `horario_termino` (simples) ou `horarioTermino` dentro do array `servicos` (pacote) no banco, recarrega os dados, e abre o WhatsApp.
- **Não**: Abre o WhatsApp sem alterar nada.

### Alterações em `src/pages/Agendamentos.tsx`

1. **Novos estados**:
   - `petProntoDialogOpen` (boolean)
   - `petProntoAgendamento` (referência ao agendamento da linha clicada)
   - `petProntoHoraAtual` (string HH:MM capturada no momento do clique)

2. **Função `handlePetProntoClick`**: Captura a hora atual, armazena o agendamento e abre o AlertDialog (em vez de abrir o WhatsApp diretamente).

3. **Função `handlePetProntoConfirm(atualizarHorario: boolean)`**:
   - Se `atualizarHorario === true`:
     - Para `tipo === "simples"`: `UPDATE agendamentos SET horario_termino = HH:MM WHERE id = ...`
     - Para `tipo === "pacote"`: Atualiza o `horarioTermino` do serviço dentro do array JSON e faz `UPDATE agendamentos_pacotes SET servicos = ...`
     - Recarrega agendamentos
   - Independente da escolha: abre o WhatsApp com `gerarUrlWhatsAppPronto`
   - Fecha o AlertDialog

4. **AlertDialog no JSX** (após os outros dialogs existentes):
   - Título: "Pet Pronto"
   - Descrição: "Deseja atualizar o horário do Fim do serviço para {HH:MM}?"
   - Botão "Sim" → `handlePetProntoConfirm(true)`
   - Botão "Não" → `handlePetProntoConfirm(false)`

5. **Botão na tabela** (linha ~3734): Trocar o `onClick` de `abrirWhatsApp(...)` para `handlePetProntoClick(agendamento, e)`.

