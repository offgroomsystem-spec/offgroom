

## Plano: Unificar mensagens WhatsApp para multiplos pets do mesmo tutor

### Resumo

Quando multiplos pets do mesmo tutor tem agendamentos no mesmo dia com criterios identicos (mesmo whatsapp, mesma data, mesmo servico, mesmo N° do pacote, mesmo taxi_dog), enviar uma unica mensagem unificada listando todos os nomes dos pets juntos, usando o horario mais cedo.

### Criterios de agrupamento

Agrupar quando TODOS estes campos forem iguais:
- `numero_whatsapp` (mesmo tutor)
- `user_id` (mesma empresa)
- `data` do