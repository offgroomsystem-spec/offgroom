import { supabase } from "@/integrations/supabase/client";

interface PetInfo {
  nome: string;
  sexo: string;
  servicos: string;
}

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
  outrosPets?: PetInfo[];
}

function getSexoPrefix(sexo: string, tipo: "do" | "o" | "ele" | "seu"): string {
  const isFemea = sexo?.toLowerCase() === "fêmea" || sexo?.toLowerCase() === "femea";
  if (tipo === "do") return isFemea ? "da" : "do";
  if (tipo === "o") return isFemea ? "a" : "o";
  if (tipo === "ele") return isFemea ? "ela" : "ele";
  if (tipo === "seu") return isFemea ? "sua" : "seu";
  return "do";
}

function formatPetsList(pets: { nome: string }[]): string {
  if (pets.length === 1) return pets[0].nome;
  if (pets.length === 2) return `${pets[0].nome} e ${pets[1].nome}`;
  return pets.slice(0, -1).map(p => p.nome).join(", ") + " e " + pets[pets.length - 1].nome;
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
  const dataBR = formatDataBR(params.dataAgendamento);
  const bordaoLine = params.bordao ? `\n\n*${params.bordao}*` : "";
  
  const allPets = [{ nome: params.nomePet, sexo: params.sexoPet, servicos: params.servicos }, ...(params.outrosPets || [])];
  const nomesConcat = formatPetsList(allPets);
  const isSingular = allPets.length === 1;
  const allFemale = allPets.every(p => p.sexo?.toLowerCase() === "fêmea" || p.sexo?.toLowerCase() === "femea");
  
  const doDa = isSingular ? getSexoPrefix(allPets[0].sexo, "do") : (allFemale ? "das" : "dos");
  const pluralS = isSingular ? "" : "s";
  
  let servicosBlock = "";
  if (isSingular) {
    servicosBlock = `\n*Serviço:* ${params.servicos}`;
  } else {
    servicosBlock = allPets.map(p => `\n*Serviço ${p.nome}:* ${p.servicos}`).join("");
  }

  const pacoteInfo = params.isPacote 
    ? `\n*N° do Pacote:* ${params.servicoNumero || "Sim"}`
    : `\n*Pacote de serviços:* Sem Pacote 😕`;

  const baseMessage = `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa}${pluralS} ${nomesConcat} com a gente.\n\n*Dia:* ${dataBR}\n*Horario:* ${params.horarioInicio}${servicosBlock}${pacoteInfo}\n*Taxi Dog:* ${params.taxiDog}`;

  if (params.isPacote && params.isUltimoServicoPacote) {
    const doDaPet = isSingular ? getSexoPrefix(allPets[0].sexo, "do") : (allFemale ? "das" : "dos");
    return `${baseMessage}\n\nNotei que hoje finalizamos o pacote atual. Que tal já renovar para manter a frequência ideal dos banhos ${doDaPet}${pluralS} ${nomesConcat}. Assim, você também garante os próximos horários com mais tranquilidade. 😊${bordaoLine}`;
  }

  return `${baseMessage}${bordaoLine}`;
}

function buildReminderMessage(params: ScheduleParams, petsList?: Array<{nome: string, sexo: string}>): string {
  const primeiroNome = getPrimeiroNome(params.nomeCliente);
  const pets = petsList && petsList.length > 0
    ? petsList
    : [{ nome: params.nomePet, sexo: params.sexoPet }, ...(params.outrosPets || [])];

  const allFemale = pets.every(p => p.sexo?.toLowerCase() === "fêmea" || p.sexo?.toLowerCase() === "femea");
  const isSingular = pets.length === 1;
  const nomesConcat = formatPetsList(pets);

  const artigo = isSingular 
    ? getSexoPrefix(pets[0].sexo, "o")
    : (allFemale ? "as" : "os");
    
  const pronome = isSingular
    ? (allFemale ? "ela" : "ele")
    : (allFemale ? "elas" : "eles");

  return `Oi ${primeiroNome}! 😄\n\nNão esqueça de trazer ${artigo} ${nomesConcat} hoje às ${params.horarioInicio}.\n\nEsse horário estamos por aqui prontos para receber ${pronome}! 🐾💙`;
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

export async function scheduleWhatsAppMessages(params: ScheduleParams & { clienteId?: string }) {
  const now = params.createdAt || new Date();

  // Verificar se o cliente tem WhatsApp ativo
  if (params.clienteId) {
    const { data: clienteData } = await supabase
      .from("clientes")
      .select("whatsapp_ativo")
      .eq("id", params.clienteId)
      .single();
    if (clienteData && (clienteData as any).whatsapp_ativo === false) {
      return;
    }

    // Verificar se o pet tem WhatsApp ativo
    const { data: petData } = await supabase
      .from("pets")
      .select("whatsapp_ativo")
      .eq("cliente_id", params.clienteId)
      .eq("nome_pet", params.nomePet)
      .limit(1);
    if (petData && petData.length > 0 && (petData[0] as any).whatsapp_ativo === false) {
      return;
    }
  }

  // 1. Verificar se já existe uma mensagem pendente para este cliente, data e hora
  // Isso permite agrupar múltiplos pets que são adicionados um a um
  const agendamentoDateTime = parseDateTime(params.dataAgendamento, params.horarioInicio);
  
  // Formatar número WhatsApp (garantir formato E.164)
  let numero = params.whatsapp.replace(/\D/g, "");
  if (!numero.startsWith("55")) {
    numero = "55" + numero;
  }

  // Buscar mensagens pendentes para o mesmo número e horário (aproximado por minuto)
  const startTime = new Date(agendamentoDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existingMessages } = await supabase
    .from("whatsapp_mensagens_agendadas" as any)
    .select("*")
    .eq("numero_whatsapp", numero)
    .eq("status", "pendente")
    .eq("user_id", params.userId)
    .gt("agendado_para", startTime);

  // Se já houver mensagens pendentes para este horário, vamos consolidar
  const updatedParams = { ...params };
  if (existingMessages && existingMessages.length > 0) {
    // Filtrar mensagens que batem com os horários de lembrete que vamos gerar
    // Para simplificar, vamos apenas adicionar os pets se encontrarmos mensagens que pareçam ser do mesmo agendamento
    // (mesmo dia e hora de início no texto ou metadados)
    
    // Por enquanto, vamos focar em consolidar quando passamos explicitamente 'outrosPets'
    // Se não passamos, e encontramos algo no DB, poderíamos tentar extrair dados, mas é complexo.
    // O melhor é garantir que o caller em Agendamentos.tsx passe todos de uma vez.
  }

  const confirmationMsg = buildConfirmationMessage(updatedParams);
  const mensagensParaInserir: any[] = [];

  const baseRecord = {
    user_id: params.userId,
    agendamento_id: params.agendamentoId || null,
    agendamento_pacote_id: params.agendamentoPacoteId || null,
    servico_numero: params.servicoNumero || null,
    numero_whatsapp: numero,
    status: "pendente",
  };

  const horariosAgendados = new Set<string>();

  function addMensagem(tipoMsg: string, agendadoPara: Date, texto: string) {
    const key = agendadoPara.toISOString().substring(0, 16);
    if (horariosAgendados.has(key)) return;
    horariosAgendados.add(key);
    mensagensParaInserir.push({
      ...baseRecord,
      tipo_mensagem: tipoMsg,
      mensagem: texto,
      agendado_para: agendadoPara.toISOString(),
    });
  }

  const diffMinutes = (agendamentoDateTime.getTime() - now.getTime()) / (1000 * 60);

  if (diffMinutes <= 60 && diffMinutes >= -60) {
    return;
  }

  if (usarPeriodoCustom) {
    if (conf24h && diffMinutes > 24 * 60) {
      const agendadoPara = new Date(agendamentoDateTime.getTime() - 24 * 60 * 60 * 1000);
      if (agendadoPara.getTime() > now.getTime()) addMensagem("24h", agendadoPara, confirmationMsg);
    }

    if (conf15h && diffMinutes > 15 * 60) {
      let agendadoPara = new Date(agendamentoDateTime.getTime() - 15 * 60 * 60 * 1000);
      const brtHour = (agendadoPara.getUTCHours() - 3 + 24) % 24;
      if (brtHour > 18) agendadoPara.setUTCHours(21, 0, 0, 0);
      if (agendadoPara.getTime() > now.getTime()) addMensagem("15h", agendadoPara, confirmationMsg);
    }

    if (conf3h && diffMinutes > 3 * 60) {
      let agendadoPara = new Date(agendamentoDateTime.getTime() - 3 * 60 * 60 * 1000);
      const brtHour = (agendadoPara.getUTCHours() - 3 + 24) % 24;
      if (brtHour < 7) agendadoPara.setUTCHours(10, 0, 0, 0);
      if (agendadoPara.getTime() > now.getTime()) addMensagem("3h", agendadoPara, confirmationMsg);
    }

    const menorPeriodoMinutos = conf3h ? 3 * 60 : conf15h ? 15 * 60 : conf24h ? 24 * 60 : 3 * 60;
    if (diffMinutes > 61 && diffMinutes <= menorPeriodoMinutos) {
      addMensagem("imediata", now, confirmationMsg);
    }
  } else {
    if (diffMinutes > 3 * 60) {
      let agendadoPara3h = new Date(agendamentoDateTime.getTime() - 3 * 60 * 60 * 1000);
      const brtHour3h = (agendadoPara3h.getUTCHours() - 3 + 24) % 24;
      if (brtHour3h < 7) agendadoPara3h.setUTCHours(10, 0, 0, 0);
      if (agendadoPara3h.getTime() > now.getTime()) addMensagem("3h", agendadoPara3h, confirmationMsg);
    }
    if (diffMinutes > 61 && diffMinutes <= 3 * 60) {
      addMensagem("3h", now, confirmationMsg);
    }
  }

  if (params.taxiDog === "Não" && diffMinutes > 30) {
    const agendadoPara30min = new Date(agendamentoDateTime.getTime() - 30 * 60 * 1000);
    const brtHour30 = (agendadoPara30min.getUTCHours() - 3 + 24) % 24;
    if (brtHour30 < 7) agendadoPara30min.setUTCHours(10, 0, 0, 0);
    if (agendadoPara30min.getTime() > now.getTime()) {
      const reminderMsg = buildReminderMessage(updatedParams);
      addMensagem("30min", agendadoPara30min, reminderMsg);
    }
  }

  if (mensagensParaInserir.length > 0) {
    for (const msg of mensagensParaInserir) {
      // Tentar encontrar uma mensagem pendente similar para atualizar em vez de inserir
      // Uma mensagem é similar se tiver o mesmo número, tipo e estiver agendada para o mesmo minuto
      const msgKey = msg.agendado_para.substring(0, 16);
      
      const similar = existingMessages?.find(m => 
        m.tipo_mensagem === msg.tipo_mensagem && 
        m.agendado_para.substring(0, 16) === msgKey
      );

      if (similar) {
        // Se encontramos uma similar, vamos atualizar o texto
        // Nota: Isso assume que o caller passou a lista consolidada de pets.
        // Se não passou, poderíamos tentar fazer o merge do texto aqui, mas é arriscado.
        const { error } = await supabase
          .from("whatsapp_mensagens_agendadas" as any)
          .update({ mensagem: msg.mensagem })
          .eq("id", similar.id);
        
        if (error) console.error("Erro ao atualizar mensagem WhatsApp similar:", error);
      } else {
        const { error } = await supabase
          .from("whatsapp_mensagens_agendadas" as any)
          .insert(msg);

        if (error && error.code !== "23505") {
          console.error("Erro ao agendar mensagem WhatsApp:", error);
        }
      }
    }
  }
}
}
