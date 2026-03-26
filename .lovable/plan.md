

## Plano: Sincronizar mensagens 30min com horario atualizado do agendamento

### Problema

Quando o usuario edita o horario de um agendamento (ex: 13:30 → 16:00), o frontend chama `deletePendingMessages` e depois `scheduleWhatsAppMessages`. Porem ha duas falhas:

1. **Race condition com Stage C (auto-create)**: O cron roda a cada minuto. Se Stage C executa entre o delete e o insert do frontend, ele ve que nao existe mensagem 30min para o agendamento e cria uma nova — potencialmente com o timing correto, mas duplicando. Ou pior: se executa antes do delete, a mensagem antiga (13:00) ainda existe e pode ser disparada por Stage B antes do frontend atualiza-la.

2. **Stage B nao valida o `agendado_para`**: Quando Stage B processa uma mensagem pendente de 30min, ele re-extrai o horario do agendamento do banco (correto: 16:00), mas usa o `agendado_para` original da mensagem (13:00) para decidir quando disparar. Se a mensagem com agendado_para=13:00 ainda existe (delete falhou ou race condition), ela eh disparada as 13:00 com o texto correto (16:00) mas no momento errado.

### Solucao

Adicionar **validacao de sincronizacao** no Stage B da edge function: antes de enviar uma mensagem de 30min, comparar o `agendado_para` da mensagem com o horario real do agendamento. Se nao baterem, **reagendar** a mensagem (atualizar `agendado_para`) em vez de enviar.

### Alteracoes

**Arquivo: `supabase/functions/whatsapp-scheduler/index.ts`**

No Stage B, apos extrair os dados do agendamento real (linhas 286-326 para avulso, 327-374 para pacote), adicionar logica de validacao:

1. Calcular o `agendado_para` correto para mensagens `30min`: `parseDateTimeBRT(data, horario) - 30min`
2. Comparar com o `agendado_para` original da mensagem no banco
3. Se diferem por mais de 2 minutos:
   - Atualizar o registro com o novo `agendado_para`
   - Marcar como "reagendado" e pular o envio nesta execucao
   - Na proxima execucao do cron, a mensagem sera processada no horario correto

```text
// Pseudocodigo dentro do loop de mensagens (apos extrair dados):
if (msg.tipo_mensagem === "30min" || msg.tipo_mensagem === "3h" || msg.tipo_mensagem === "15h") {
  const horarioReal = extracted.horario;
  const dataReal = extracted.data;
  const agDateTimeReal = parseDateTimeBRT(dataReal, horarioReal);
  
  let expectedAgendadoPara: Date;
  if (msg.tipo_mensagem === "30min") {
    expectedAgendadoPara = new Date(agDateTimeReal.getTime() - 30 * 60 * 1000);
  } else if (msg.tipo_mensagem === "3h") {
    expectedAgendadoPara = new Date(agDateTimeReal.getTime() - 3 * 60 * 60 * 1000);
  } else {
    expectedAgendadoPara = new Date(agDateTimeReal.getTime() - 15 * 60 * 60 * 1000);
  }
  
  const msgAgendadoPara = new Date(msg.agendado_para);
  const diffMs = Math.abs(expectedAgendadoPara.getTime() - msgAgendadoPara.getTime());
  
  if (diffMs > 2 * 60 * 1000) { // mais de 2min de diferenca
    // Reagendar mensagem
    await supabase.from("whatsapp_mensagens_agendadas")
      .update({ agendado_para: expectedAgendadoPara.toISOString() })
      .eq("id", msg.id);
    continue; // pula para proxima mensagem
  }
}
```

Esta validacao sera inserida logo apos a extracao de dados e antes de adicionar ao `regenList`, garantindo que mensagens desatualizadas sejam corrigidas automaticamente tanto para agendamentos avulsos quanto de pacotes, e tanto para clientes com um unico pet quanto com multiplos pets.

### Resultado

- Se o agendamento muda de 13:30 para 16:00, a mensagem 30min pendente (agendado_para=13:00) sera detectada como desatualizada quando o cron tentar dispara-la e sera reagendada para 15:30
- Na execucao seguinte apos 15:30, a mensagem sera disparada normalmente com o texto e horario corretos
- Funciona para avulso e pacote, um ou multiplos pets

