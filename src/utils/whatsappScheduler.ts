import { supabase } from "@/integrations/supabase/client";

interface ScheduleParams {
  userId: string;
  agendamentoId?: string;
  agendamentoPacoteId?: string;
  servicoNumero?: string;
  nomeCliente: string;
  nomePet: string;
  sexoPet: string;
  raca: string;
  whatsapp: string;
  dataAgendamento: string; // YYYY-MM-DD
  horarioInicio: string; // HH:mm
  servicos: string;
  taxiDog: string; // "Sim" ou "Não"
  bordao: string;
  isPacote: boolean;
  isUltimoServicoPacote?: boolean;
  createdAt?: Date;
}

function getSexoPrefix(sexo: string, tipo: "do" | "o" | "ele"): string {
  const isFemea = sexo?.toLowerCase() === "fêmea" || sexo?.toLowerCase() === "femea";
  if (tipo === "do") return isFemea ? "da" : "do";
  if (tipo === "o") return isFemea ? "a" : "o";
  if (tipo === "ele") return isFemea ? "ela" : "ele";
  return "do";
}

function getPrimeiroNome(nomeCompleto: string): string {
  return nomeCompleto.split(" ")[0];
}

function formatDataBR(dataISO: string): string {
  const [year, month, day] = dataISO.split("-");
  return `${day}/${month}/${year}`;
}

function buildConfirmationMessage(params: ScheduleParams): string {
  const primeiroNome = getPrimeiroNome(params.nomeCliente);
  const doDa = getSexoPrefix(params.sexoPet, "do");
  const dataBR = formatDataBR(params.dataAgendamento);
  const bordaoLine = params.bordao ? `\n\n*${params.bordao}*` : "";

  if (!params.isPacote) {
    // Avulso
    return `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${params.nomePet} com a gente.\n\n*Dia:* ${dataBR}\n*Horario:* ${params.horarioInicio}\n*Serviço:* ${params.servicos}\n*Pacote de serviços:* Sem Pacote 😕\n*Taxi Dog:* ${params.taxiDog}${bordaoLine}`;
  }

  if (params.isUltimoServicoPacote) {
    // Pacote - último serviço
    return `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${params.nomePet} com a gente.\n\n*Dia:* ${dataBR}\n*Horario:* ${params.horarioInicio}\n*Serviço:* ${params.servicos}\n*N° do Pacote:* ${params.servicoNumero}\n*Taxi Dog:* ${params.taxiDog}\n\nNotei que hoje finalizamos o pacote atual. Recomendo já renovar para manter a frequência ideal dos banhos ${doDa} ${params.nomePet}. Que tal já renovar agora e garantir os próximos horários disponíveis? 😊${bordaoLine}`;
  }

  // Pacote - não último
  return `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${params.nomePet} com a gente.\n\n*Dia:* ${dataBR}\n*Horario:* ${params.horarioInicio}\n*Serviço:* ${params.servicos}\n*N° do Pacote:* ${params.servicoNumero}\n*Taxi Dog:* ${params.taxiDog}${bordaoLine}`;
}

function buildReminderMessage(params: ScheduleParams): string {
  const primeiroNome = getPrimeiroNome(params.nomeCliente);
  const oA = getSexoPrefix(params.sexoPet, "o");
  const eleEla = getSexoPrefix(params.sexoPet, "ele");
  return `Oi ${primeiroNome}! 😄\n\nNão esqueça de trazer ${oA} ${params.nomePet} hoje às ${params.horarioInicio}.\n\nEsse horário estamos por aqui prontos para receber ${eleEla}! 🐾💙`;
}

function parseDateTime(date: string, time: string): Date {
  // Criar data em UTC representando horário de Brasília (UTC-3)
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours + 3, minutes, 0, 0));
}

export async function deletePendingMessages(opts: {
  agendamentoId?: string;
  agendamentoPacoteId?: string;
  servicoNumero?: string;
}) {
  let query = supabase
    .from("whatsapp_mensagens_agendadas" as any)
    .delete()
    .eq("status", "pendente");

  if (opts.agendamentoId) {
    query = query.eq("agendamento_id", opts.agendamentoId);
  }
  if (opts.agendamentoPacoteId) {
    query = query.eq("agendamento_pacote_id", opts.agendamentoPacoteId);
  }
  if (opts.servicoNumero) {
    query = query.eq("servico_numero", opts.servicoNumero);
  }

  const { error } = await query;
  if (error) {
    console.error("Erro ao deletar mensagens pendentes:", error);
  }
}

export async function scheduleWhatsAppMessages(params: ScheduleParams) {
  const now = params.createdAt || new Date();
  const agendamentoDateTime = parseDateTime(params.dataAgendamento, params.horarioInicio);
  
  // Diferença em minutos entre agora e o agendamento
  const diffMinutes = (agendamentoDateTime.getTime() - now.getTime()) / (1000 * 60);

  // Se o agendamento está dentro de 60 minutos (passado ou futuro próximo), não enviar automático
  if (diffMinutes <= 60 && diffMinutes >= -60) {
    return;
  }

  const confirmationMsg = buildConfirmationMessage(params);
  const mensagensParaInserir: any[] = [];

  // Formatar número WhatsApp (garantir formato E.164)
  let numero = params.whatsapp.replace(/\D/g, "");
  if (!numero.startsWith("55")) {
    numero = "55" + numero;
  }

  const baseRecord = {
    user_id: params.userId,
    agendamento_id: params.agendamentoId || null,
    agendamento_pacote_id: params.agendamentoPacoteId || null,
    servico_numero: params.servicoNumero || null,
    numero_whatsapp: numero,
    status: "pendente",
  };

  // === MENSAGEM 24H ANTES ===
  if (diffMinutes > 24 * 60) {
    const agendadoPara24h = new Date(agendamentoDateTime.getTime() - 24 * 60 * 60 * 1000);
    // Se a hora em Brasília (UTC-3) for antes das 7h, agendar para 7h Brasília (10h UTC)
    if (agendadoPara24h.getUTCHours() < 10 || (agendadoPara24h.getUTCHours() === 10 && agendadoPara24h.getUTCMinutes() === 0)) {
      // Check if actually before 7h BRT
      const brtHour = (agendadoPara24h.getUTCHours() - 3 + 24) % 24;
      if (brtHour < 7) {
        agendadoPara24h.setUTCHours(10, 0, 0, 0);
      }
    }
    mensagensParaInserir.push({
      ...baseRecord,
      tipo_mensagem: "24h",
      mensagem: confirmationMsg,
      agendado_para: agendadoPara24h.toISOString(),
    });
  }

  // === MENSAGEM 3H ANTES ===
  if (diffMinutes > 3 * 60) {
    let agendadoPara3h = new Date(agendamentoDateTime.getTime() - 3 * 60 * 60 * 1000);
    
    // Se o agendamento é antes das 10h Brasília, a mensagem "3h" é enviada às 7h Brasília (10h UTC)
    const horaAgendamentoBRT = ((agendamentoDateTime.getUTCHours() - 3 + 24) % 24);
    if (horaAgendamentoBRT < 10) {
      agendadoPara3h = new Date(agendamentoDateTime);
      agendadoPara3h.setUTCHours(10, 0, 0, 0); // 7h Brasília = 10h UTC
    }

    // Não agendar se horário já passou
    if (agendadoPara3h.getTime() > now.getTime()) {
      mensagensParaInserir.push({
        ...baseRecord,
        tipo_mensagem: "3h",
        mensagem: confirmationMsg,
        agendado_para: agendadoPara3h.toISOString(),
      });
    }
  }

  // === MENSAGEM 30MIN ANTES (Apenas Taxi Dog = "Não") ===
  if (params.taxiDog === "Não" && diffMinutes > 30) {
    const agendadoPara30min = new Date(agendamentoDateTime.getTime() - 30 * 60 * 1000);
    
    if (agendadoPara30min.getTime() > now.getTime()) {
      const reminderMsg = buildReminderMessage(params);
      mensagensParaInserir.push({
        ...baseRecord,
        tipo_mensagem: "30min",
        mensagem: reminderMsg,
        agendado_para: agendadoPara30min.toISOString(),
      });
    }
  }

  // === MENSAGEM DE CONFIRMAÇÃO IMEDIATA (agendamento entre 61min e 3h) ===
  if (diffMinutes > 61 && diffMinutes <= 3 * 60) {
    mensagensParaInserir.push({
      ...baseRecord,
      tipo_mensagem: "3h",
      mensagem: confirmationMsg,
      agendado_para: now.toISOString(),
    });
  }

  // Bloco "imediata" removido — o lembrete "hoje" só faz sentido 30min antes,
  // e já é coberto pelo bloco de 30min acima.

  // Inserir todas as mensagens agendadas
  if (mensagensParaInserir.length > 0) {
    const { error } = await supabase
      .from("whatsapp_mensagens_agendadas" as any)
      .insert(mensagensParaInserir);

    if (error) {
      console.error("Erro ao agendar mensagens WhatsApp:", error);
    }
  }
}
