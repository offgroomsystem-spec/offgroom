import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface WhatsAppInstance {
  user_id: string;
  instance_name: string;
  status: string;
}

interface MensagemAgendada {
  id: string;
  user_id: string;
  agendamento_id: string | null;
  agendamento_pacote_id: string | null;
  servico_numero: string | null;
  tipo_mensagem: string;
  mensagem: string;
  numero_whatsapp: string;
  agendado_para: string;
}

async function enviarMensagemEvolution(instanceName: string, number: string, text: string) {
  const baseUrl = Deno.env.get("EVOLUTION_API_URL")!;
  const apiKey = Deno.env.get("EVOLUTION_API_KEY")!;
  
  const res = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify({ number, text }),
  });
  
  const data = await res.text();
  if (!res.ok) {
    throw new Error(`Evolution API error: ${res.status} - ${data}`);
  }
  return data;
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

function isUltimoServicoPacote(servicoNumero: string): boolean {
  if (!servicoNumero) return false;
  const parts = servicoNumero.split("/");
  if (parts.length !== 2) return false;
  return parts[0] === parts[1];
}

function buildConfirmationMessage(
  nomeCliente: string, nomePet: string, sexoPet: string, data: string,
  horario: string, servicos: string, taxiDog: string, bordao: string,
  isPacote: boolean, servicoNumero: string | null, isUltimo: boolean
): string {
  const primeiroNome = getPrimeiroNome(nomeCliente);
  const doDa = getSexoPrefix(sexoPet, "do");
  const dataBR = formatDataBR(data);
  const bordaoLine = bordao ? `\n\n*${bordao}*` : "";

  if (!isPacote) {
    return `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${nomePet} com a gente.\n\n*Dia:* ${dataBR}\n*Horario:* ${horario}\n*Serviço:* ${servicos}\n*Pacote de serviços:* Sem Pacote 😕\n*Taxi Dog:* ${taxiDog}${bordaoLine}`;
  }

  if (isUltimo) {
    return `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${nomePet} com a gente.\n\n*Dia:* ${dataBR}\n*Horario:* ${horario}\n*Serviço:* ${servicos}\n*N° do Pacote:* ${servicoNumero}\n*Taxi Dog:* ${taxiDog}\n\nNotei que hoje finalizamos o pacote atual. Recomendo já renovar para manter a frequência ideal dos banhos ${doDa} ${nomePet}. Que tal já renovar agora e garantir os próximos horários disponíveis? 😊${bordaoLine}`;
  }

  return `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${nomePet} com a gente.\n\n*Dia:* ${dataBR}\n*Horario:* ${horario}\n*Serviço:* ${servicos}\n*N° do Pacote:* ${servicoNumero}\n*Taxi Dog:* ${taxiDog}${bordaoLine}`;
}

function buildReminderMessage(nomeCliente: string, nomePet: string, sexoPet: string, horario: string): string {
  const primeiroNome = getPrimeiroNome(nomeCliente);
  const oA = getSexoPrefix(sexoPet, "o");
  const eleEla = getSexoPrefix(sexoPet, "ele");
  return `Oi ${primeiroNome}! 😄\n\nNão esqueça de trazer ${oA} ${nomePet} hoje às ${horario}.\n\nEsse horário estamos por aqui prontos para receber ${eleEla}! 🐾💙`;
}

function buildUnifiedPetNames(petInfos: Array<{nome: string, sexo: string}>): { namesStr: string, doDa: string } {
  const names = petInfos.map(p => p.nome);
  let namesStr: string;
  if (names.length === 1) {
    namesStr = names[0];
  } else if (names.length === 2) {
    namesStr = `${names[0]} e ${names[1]}`;
  } else {
    namesStr = names.slice(0, -1).join(", ") + " e " + names[names.length - 1];
  }
  const allFemale = petInfos.every(p => {
    const s = p.sexo?.toLowerCase();
    return s === "fêmea" || s === "femea";
  });
  const doDa = allFemale ? "da" : "do";
  return { namesStr, doDa };
}

function buildUnifiedConfirmationMessage(
  nomeCliente: string, petInfos: Array<{nome: string, sexo: string, servico: string}>,
  data: string, horario: string, taxiDog: string, bordao: string,
  isPacote: boolean, servicoNumero: string | null, isUltimo: boolean
): string {
  const primeiroNome = getPrimeiroNome(nomeCliente);
  const { namesStr, doDa } = buildUnifiedPetNames(petInfos);
  const dataBR = formatDataBR(data);
  const bordaoLine = bordao ? `\n\n*${bordao}*` : "";

  // Build service line(s)
  const allSameService = petInfos.every(p => p.servico === petInfos[0].servico);
  let servicoLines: string;
  if (allSameService) {
    servicoLines = `*Serviço:* ${petInfos[0].servico}`;
  } else {
    servicoLines = petInfos.map(p => `*Serviço ${p.nome}:* ${p.servico}`).join("\n");
  }

  if (!isPacote) {
    return `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${namesStr} com a gente.\n\n*Dia:* ${dataBR}\n*Horario:* ${horario}\n${servicoLines}\n*Pacote de serviços:* Sem Pacote 😕\n*Taxi Dog:* ${taxiDog}${bordaoLine}`;
  }

  if (isUltimo) {
    return `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${namesStr} com a gente.\n\n*Dia:* ${dataBR}\n*Horario:* ${horario}\n${servicoLines}\n*N° do Pacote:* ${servicoNumero}\n*Taxi Dog:* ${taxiDog}\n\nNotei que hoje finalizamos o pacote atual. Recomendo já renovar para manter a frequência ideal dos banhos ${doDa} ${namesStr}. Que tal já renovar agora e garantir os próximos horários disponíveis? 😊${bordaoLine}`;
  }

  return `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${namesStr} com a gente.\n\n*Dia:* ${dataBR}\n*Horario:* ${horario}\n${servicoLines}\n*N° do Pacote:* ${servicoNumero}\n*Taxi Dog:* ${taxiDog}${bordaoLine}`;
}

function buildUnifiedReminderMessage(
  nomeCliente: string, petInfos: Array<{nome: string, sexo: string}>, horario: string
): string {
  const primeiroNome = getPrimeiroNome(nomeCliente);
  const { namesStr } = buildUnifiedPetNames(petInfos);
  const allFemale = petInfos.every(p => {
    const s = p.sexo?.toLowerCase();
    return s === "fêmea" || s === "femea";
  });
  const oA = allFemale ? "a" : "o";
  const eleEla = petInfos.length === 1 ? (allFemale ? "ela" : "ele") : (allFemale ? "elas" : "eles");
  return `Oi ${primeiroNome}! 😄\n\nNão esqueça de trazer ${oA} ${namesStr} hoje às ${horario}.\n\nEsse horário estamos por aqui prontos para receber ${eleEla}! 🐾💙`;
}

function formatNumero(whatsapp: string): string {
  let numero = whatsapp.replace(/\D/g, "");
  if (!numero.startsWith("55")) {
    numero = "55" + numero;
  }
  return numero;
}

// Convert date + time to UTC, treating input as Brasília time (UTC-3)
function parseDateTimeBRT(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours + 3, minutes, 0, 0));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();

    // 1. Buscar instâncias WhatsApp conectadas
    const { data: instances, error: instErr } = await supabase
      .from("whatsapp_instances")
      .select("user_id, instance_name, status")
      .eq("status", "connected");

    if (instErr) {
      console.error("Error fetching instances:", instErr);
      return new Response(JSON.stringify({ error: instErr.message }), { status: 500, headers: corsHeaders });
    }

    if (!instances || instances.length === 0) {
      return new Response(JSON.stringify({ message: "No connected instances" }), { headers: corsHeaders });
    }

    // 2. Buscar empresa_config para verificar evolution_auto_send
    const userIds = instances.map((i: WhatsAppInstance) => i.user_id);
    const { data: empresaConfigs } = await supabase
      .from("empresa_config")
      .select("user_id, evolution_auto_send, bordao, confirmacao_periodo_ativo, confirmacao_24h, confirmacao_15h, confirmacao_3h")
      .in("user_id", userIds);

    const autoSendEnabled = new Set(
      (empresaConfigs || [])
        .filter((e: any) => e.evolution_auto_send === true)
        .map((e: any) => e.user_id)
    );

    const bordaoMap = new Map<string, string>();
    const confirmConfigMap = new Map<string, { ativo: boolean; h24: boolean; h15: boolean; h3: boolean }>();
    for (const ec of (empresaConfigs || [])) {
      bordaoMap.set(ec.user_id, ec.bordao || "");
      confirmConfigMap.set(ec.user_id, {
        ativo: ec.confirmacao_periodo_ativo ?? true,
        h24: ec.confirmacao_24h ?? false,
        h15: ec.confirmacao_15h ?? false,
        h3: ec.confirmacao_3h ?? true,
      });
    }

    // Filter only instances with auto_send enabled
    const activeInstances = instances.filter((i: WhatsAppInstance) => autoSendEnabled.has(i.user_id));

    if (activeInstances.length === 0) {
      return new Response(JSON.stringify({ message: "No instances with auto-send enabled" }), { headers: corsHeaders });
    }

    const activeUserIds = activeInstances.map((i: WhatsAppInstance) => i.user_id);
    const instanceMap = new Map<string, string>();
    for (const inst of activeInstances) {
      instanceMap.set(inst.user_id, inst.instance_name);
    }

    // =============================================
    // ETAPA A: Auto-criar mensagens para agendamentos sem mensagens
    // =============================================
    await autoCreateMissingMessages(supabase, activeUserIds, bordaoMap, confirmConfigMap, now);

    // =============================================
    // ETAPA B: Processar mensagens pendentes
    // =============================================
    const { data: mensagens, error: msgErr } = await supabase
      .from("whatsapp_mensagens_agendadas")
      .select("*")
      .eq("status", "pendente")
      .lte("agendado_para", now.toISOString())
      .in("user_id", activeUserIds)
      .order("agendado_para", { ascending: true })
      .limit(50);

    if (msgErr) {
      console.error("Error fetching messages:", msgErr);
      return new Response(JSON.stringify({ error: msgErr.message }), { status: 500, headers: corsHeaders });
    }

    if (!mensagens || mensagens.length === 0) {
      return new Response(JSON.stringify({ message: "No pending messages, auto-create done" }), { headers: corsHeaders });
    }

    // === COLLECT REGEN DATA FOR ALL MESSAGES ===
    interface RegenData {
      msgId: string;
      userId: string;
      nomeCliente: string;
      nomePet: string;
      sexoPet: string;
      data: string;
      horario: string;
      servico: string;
      taxiDog: string;
      isPacote: boolean;
      servicoNumero: string | null;
      isUltimo: boolean;
      tipoMensagem: string;
      numeroWhatsapp: string;
      bordao: string;
      hasFallback: boolean;
    }

    const regenList: RegenData[] = [];

    for (const msg of mensagens as MensagemAgendada[]) {
      const bordao = bordaoMap.get(msg.user_id) || "";
      let extracted: RegenData | null = null;

      try {
        if (msg.agendamento_id) {
          const { data: agAtual } = await supabase
            .from("agendamentos")
            .select("cliente, pet, raca, whatsapp, data, horario, servico, taxi_dog, numero_servico_pacote, status, cliente_id")
            .eq("id", msg.agendamento_id)
            .single();

          if (!agAtual || agAtual.status === "Cancelado") {
            await supabase.from("whatsapp_mensagens_agendadas").update({ status: "cancelado", erro: "Agendamento removido ou cancelado" }).eq("id", msg.id);
            continue;
          }

          if (agAtual.cliente_id) {
            const { data: clienteCheck } = await supabase.from("clientes").select("whatsapp_ativo").eq("id", agAtual.cliente_id).single();
            if (clienteCheck && clienteCheck.whatsapp_ativo === false) {
              await supabase.from("whatsapp_mensagens_agendadas").update({ status: "cancelado", erro: "WhatsApp desativado para este cliente" }).eq("id", msg.id);
              continue;
            }
            const { data: petCheck } = await supabase.from("pets").select("whatsapp_ativo").eq("cliente_id", agAtual.cliente_id).eq("nome_pet", agAtual.pet).limit(1);
            if (petCheck && petCheck.length > 0 && petCheck[0].whatsapp_ativo === false) {
              await supabase.from("whatsapp_mensagens_agendadas").update({ status: "cancelado", erro: "WhatsApp desativado para este pet" }).eq("id", msg.id);
              continue;
            }
          }

          let sexoPet = "Macho";
          if (agAtual.cliente_id) {
            const { data: petData } = await supabase.from("pets").select("sexo").eq("cliente_id", agAtual.cliente_id).eq("nome_pet", agAtual.pet).limit(1);
            if (petData && petData.length > 0) sexoPet = petData[0].sexo || "Macho";
          }

          // Cross-validate client name AND WhatsApp against cadastro (source of truth)
          let nomeClienteValidado = agAtual.cliente;
          let numeroWhatsappAtualizado = msg.numero_whatsapp;
          if (agAtual.cliente_id) {
            const { data: clienteReal } = await supabase.from("clientes").select("nome_cliente, whatsapp").eq("id", agAtual.cliente_id).single();
            if (clienteReal) {
              if (clienteReal.nome_cliente.trim() !== agAtual.cliente.trim()) {
                console.log(`Client name mismatch (avulso): agendamento="${agAtual.cliente}" cadastro="${clienteReal.nome_cliente}". Using cadastro.`);
                nomeClienteValidado = clienteReal.nome_cliente;
              }
              // Always use latest WhatsApp from client record
              const latestWhatsapp = formatNumero(clienteReal.whatsapp);
              if (latestWhatsapp && latestWhatsapp !== msg.numero_whatsapp) {
                console.log(`WhatsApp updated (avulso): msg stored="${msg.numero_whatsapp}" cadastro="${latestWhatsapp}". Using cadastro.`);
                numeroWhatsappAtualizado = latestWhatsapp;
              }
            }
          } else {
            // No cliente_id — try to find by whatsapp number
            const numNorm = formatNumero(agAtual.whatsapp);
            const { data: clientesByNum } = await supabase.from("clientes").select("nome_cliente, whatsapp").eq("user_id", msg.user_id);
            const clienteReal = (clientesByNum || []).find(c => formatNumero(c.whatsapp) === numNorm);
            if (clienteReal && clienteReal.nome_cliente.trim() !== agAtual.cliente.trim()) {
              console.log(`Client name mismatch (avulso no id): agendamento="${agAtual.cliente}" cadastro="${clienteReal.nome_cliente}". Using cadastro.`);
              nomeClienteValidado = clienteReal.nome_cliente;
            }
          }

          extracted = {
            msgId: msg.id, userId: msg.user_id,
            nomeCliente: nomeClienteValidado, nomePet: agAtual.pet, sexoPet,
            data: agAtual.data, horario: agAtual.horario, servico: agAtual.servico,
            taxiDog: agAtual.taxi_dog, isPacote: !!agAtual.numero_servico_pacote,
            servicoNumero: agAtual.numero_servico_pacote,
            isUltimo: !!agAtual.numero_servico_pacote && isUltimoServicoPacote(agAtual.numero_servico_pacote),
            tipoMensagem: msg.tipo_mensagem, numeroWhatsapp: numeroWhatsappAtualizado,
            bordao, hasFallback: false,
          };
        } else if (msg.agendamento_pacote_id) {
          const { data: pacoteAtual } = await supabase
            .from("agendamentos_pacotes")
            .select("nome_cliente, nome_pet, raca, whatsapp, servicos, taxi_dog")
            .eq("id", msg.agendamento_pacote_id)
            .single();

          if (!pacoteAtual) {
            await supabase.from("whatsapp_mensagens_agendadas").update({ status: "cancelado", erro: "Pacote removido" }).eq("id", msg.id);
            continue;
          }

          const { data: clienteCheck2 } = await supabase.from("clientes").select("whatsapp_ativo").eq("user_id", msg.user_id).eq("nome_cliente", pacoteAtual.nome_cliente).limit(1);
          if (clienteCheck2 && clienteCheck2.length > 0 && clienteCheck2[0].whatsapp_ativo === false) {
            await supabase.from("whatsapp_mensagens_agendadas").update({ status: "cancelado", erro: "WhatsApp desativado para este cliente" }).eq("id", msg.id);
            continue;
          }

          const { data: petCheckPacote } = await supabase.from("pets").select("whatsapp_ativo").eq("user_id", msg.user_id).eq("nome_pet", pacoteAtual.nome_pet).limit(1);
          if (petCheckPacote && petCheckPacote.length > 0 && petCheckPacote[0].whatsapp_ativo === false) {
            await supabase.from("whatsapp_mensagens_agendadas").update({ status: "cancelado", erro: "WhatsApp desativado para este pet" }).eq("id", msg.id);
            continue;
          }

          const servicos = pacoteAtual.servicos as any[];
          const svAtual = servicos?.find((s: any) => s.numero === msg.servico_numero);

          if (!svAtual || svAtual.status === "Cancelado") {
            await supabase.from("whatsapp_mensagens_agendadas").update({ status: "cancelado", erro: "Serviço do pacote removido ou cancelado" }).eq("id", msg.id);
            continue;
          }

          let sexoPet = "Macho";
          const { data: petData } = await supabase.from("pets").select("sexo").eq("user_id", msg.user_id).eq("nome_pet", pacoteAtual.nome_pet).limit(1);
          if (petData && petData.length > 0) sexoPet = petData[0].sexo || "Macho";

          const servicoNumero = svAtual.numero || msg.servico_numero;
          const servicoNome = svAtual.nomeServico || svAtual.servico || svAtual.nome || "Banho";

          // Cross-validate client name AND WhatsApp against cadastro (source of truth)
          let nomeClientePacoteValidado = pacoteAtual.nome_cliente;
          let numeroWhatsappPacoteAtualizado = msg.numero_whatsapp;
          const numNormPacote = formatNumero(pacoteAtual.whatsapp);
          const { data: clientesByNumPacote } = await supabase.from("clientes").select("nome_cliente, whatsapp").eq("user_id", msg.user_id);
          // Try matching by name first (more reliable for pacotes), then by number
          const clienteRealPacote = (clientesByNumPacote || []).find(c => 
            c.nome_cliente.trim() === pacoteAtual.nome_cliente.trim()
          ) || (clientesByNumPacote || []).find(c => formatNumero(c.whatsapp) === numNormPacote);
          
          if (clienteRealPacote) {
            if (clienteRealPacote.nome_cliente.trim() !== pacoteAtual.nome_cliente.trim()) {
              console.log(`Client name mismatch (pacote): pacote="${pacoteAtual.nome_cliente}" cadastro="${clienteRealPacote.nome_cliente}". Using cadastro.`);
              nomeClientePacoteValidado = clienteRealPacote.nome_cliente;
            }
            // Always use latest WhatsApp from client record
            const latestWhatsapp = formatNumero(clienteRealPacote.whatsapp);
            if (latestWhatsapp && latestWhatsapp !== msg.numero_whatsapp) {
              console.log(`WhatsApp updated (pacote): msg stored="${msg.numero_whatsapp}" cadastro="${latestWhatsapp}". Using cadastro.`);
              numeroWhatsappPacoteAtualizado = latestWhatsapp;
            }
          }

          extracted = {
            msgId: msg.id, userId: msg.user_id,
            nomeCliente: nomeClientePacoteValidado, nomePet: pacoteAtual.nome_pet, sexoPet,
            data: svAtual.data, horario: svAtual.horarioInicio, servico: servicoNome,
            taxiDog: pacoteAtual.taxi_dog, isPacote: true,
            servicoNumero, isUltimo: isUltimoServicoPacote(servicoNumero || ""),
            tipoMensagem: msg.tipo_mensagem, numeroWhatsapp: numeroWhatsappPacoteAtualizado,
            bordao, hasFallback: false,
          };
        }
      } catch (regenErr) {
        console.error(`Error extracting data for message ${msg.id}:`, regenErr);
      }

      if (extracted) {
        // === SYNC VALIDATION: check if agendado_para matches actual appointment time ===
        if (extracted.data && extracted.horario && 
            (msg.tipo_mensagem === "30min" || msg.tipo_mensagem === "3h")) {
          const agDateTimeReal = parseDateTimeBRT(extracted.data, extracted.horario);
          let bufferMs: number;
          if (msg.tipo_mensagem === "30min") {
            bufferMs = 30 * 60 * 1000;
          } else {
            bufferMs = 3 * 60 * 60 * 1000;
          }
          const expectedAgendadoPara = new Date(agDateTimeReal.getTime() - bufferMs);
          const msgAgendadoPara = new Date(msg.agendado_para);
          const diffMs = Math.abs(expectedAgendadoPara.getTime() - msgAgendadoPara.getTime());

          if (diffMs > 2 * 60 * 1000) {
            // Appointment time changed — reschedule this message
            console.log(`Sync: msg ${msg.id} agendado_para ${msg.agendado_para} differs from expected ${expectedAgendadoPara.toISOString()} by ${Math.round(diffMs/60000)}min. Rescheduling.`);
            await supabase.from("whatsapp_mensagens_agendadas")
              .update({ agendado_para: expectedAgendadoPara.toISOString() })
              .eq("id", msg.id);
            continue; // skip this message, it will be picked up at the correct time
          }
        }

        regenList.push(extracted);
      } else {
        // Fallback: mark as ungroupable, will send with stored message
        regenList.push({
          msgId: msg.id, userId: msg.user_id,
          nomeCliente: "", nomePet: "", sexoPet: "Macho",
          data: "", horario: "", servico: "", taxiDog: "",
          isPacote: false, servicoNumero: null, isUltimo: false,
          tipoMensagem: msg.tipo_mensagem, numeroWhatsapp: msg.numero_whatsapp,
          bordao: "", hasFallback: true,
        });
      }
    }

    // === GROUP MESSAGES BY KEY ===
    const groupMap = new Map<string, RegenData[]>();
    const ungroupable: RegenData[] = [];

    for (const rd of regenList) {
      if (rd.hasFallback || !rd.nomeCliente) {
        ungroupable.push(rd);
        continue;
      }
      // Para mensagens de 30min, agrupar apenas por userId|numero|tipo|data (sem servicoNumero/taxiDog)
      // para unificar pets avulsos e de pacote do mesmo cliente
      const key = rd.tipoMensagem === "30min"
        ? `${rd.userId}|${rd.numeroWhatsapp}|${rd.tipoMensagem}|${rd.data}`
        : `${rd.userId}|${rd.numeroWhatsapp}|${rd.tipoMensagem}|${rd.data}|${rd.servicoNumero || "null"}|${rd.taxiDog}`;
      const group = groupMap.get(key) || [];
      group.push(rd);
      groupMap.set(key, group);
    }

    let enviados = 0;
    let falhas = 0;

    // Process grouped messages
    for (const [, group] of groupMap) {
      const first = group[0];
      const instanceName = instanceMap.get(first.userId);
      if (!instanceName) {
        for (const rd of group) {
          await supabase.from("whatsapp_mensagens_agendadas").update({ status: "falha", erro: "Instância não encontrada" }).eq("id", rd.msgId);
        }
        falhas += group.length;
        continue;
      }

      // Deduplicate pets (keeping servico per pet)
      const seenPets = new Set<string>();
      const petInfos: Array<{nome: string, sexo: string, servico: string}> = [];
      for (const rd of group) {
        if (!seenPets.has(rd.nomePet)) {
          seenPets.add(rd.nomePet);
          petInfos.push({ nome: rd.nomePet, sexo: rd.sexoPet, servico: rd.servico });
        }
      }

      // Use earliest horario
      const horarios = group.map(rd => rd.horario).filter(Boolean).sort();
      const horario = horarios[0] || first.horario;

      // If any in group is ultimo, consider ultimo
      const isUltimo = group.some(rd => rd.isUltimo);

      let mensagemFinal: string;
      if (first.tipoMensagem === "30min") {
        mensagemFinal = buildUnifiedReminderMessage(first.nomeCliente, petInfos, horario);
      } else {
        mensagemFinal = buildUnifiedConfirmationMessage(
          first.nomeCliente, petInfos, first.data, horario,
          first.taxiDog, first.bordao,
          first.isPacote, first.servicoNumero, isUltimo
        );
      }

      try {
        await enviarMensagemEvolution(instanceName, first.numeroWhatsapp, mensagemFinal);
        for (const rd of group) {
          await supabase.from("whatsapp_mensagens_agendadas")
            .update({ status: "enviado", enviado_em: new Date().toISOString(), mensagem: mensagemFinal })
            .eq("id", rd.msgId);
        }
        enviados++;
        await sleep(10000);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
        console.error(`Failed to send grouped message:`, errorMsg);
        for (const rd of group) {
          await supabase.from("whatsapp_mensagens_agendadas")
            .update({ status: "falha", erro: errorMsg })
            .eq("id", rd.msgId);
        }
        falhas++;
      }
    }

    // Process ungroupable (fallback with stored message)
    for (const rd of ungroupable) {
      const instanceName = instanceMap.get(rd.userId);
      const originalMsg = (mensagens as MensagemAgendada[]).find(m => m.id === rd.msgId);
      if (!instanceName || !originalMsg?.mensagem) {
        await supabase.from("whatsapp_mensagens_agendadas").update({ status: "falha", erro: "Instância não encontrada ou mensagem vazia" }).eq("id", rd.msgId);
        falhas++;
        continue;
      }
      try {
        await enviarMensagemEvolution(instanceName, rd.numeroWhatsapp, originalMsg.mensagem);
        await supabase.from("whatsapp_mensagens_agendadas")
          .update({ status: "enviado", enviado_em: new Date().toISOString() })
          .eq("id", rd.msgId);
        enviados++;
        await sleep(10000);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
        await supabase.from("whatsapp_mensagens_agendadas")
          .update({ status: "falha", erro: errorMsg })
          .eq("id", rd.msgId);
        falhas++;
      }
    }

    return new Response(
      JSON.stringify({ enviados, falhas, total: mensagens.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("Scheduler error:", err);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});

// =============================================
// AUTO-CREATE MISSING MESSAGES
// =============================================
async function autoCreateMissingMessages(
  supabase: any,
  activeUserIds: string[],
  bordaoMap: Map<string, string>,
  confirmConfigMap: Map<string, { ativo: boolean; h24: boolean; h15: boolean; h3: boolean }>,
  now: Date
) {
  try {
    // Calculate today and tomorrow in BRT (UTC-3)
    const brtOffset = -3;
    const brtNow = new Date(now.getTime() + brtOffset * 60 * 60 * 1000);
    const todayBRT = brtNow.toISOString().split("T")[0]; // YYYY-MM-DD
    const tomorrowDate = new Date(brtNow);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowBRT = tomorrowDate.toISOString().split("T")[0];

    // Fetch agendamentos avulsos for today and tomorrow
    const { data: agendamentos } = await supabase
      .from("agendamentos")
      .select("id, user_id, cliente, pet, raca, whatsapp, data, horario, servico, taxi_dog, numero_servico_pacote, status, cliente_id")
      .in("user_id", activeUserIds)
      .in("data", [todayBRT, tomorrowBRT])
      .neq("status", "Cancelado");

    if (!agendamentos || agendamentos.length === 0) {
      console.log("No appointments found for today/tomorrow");
      return;
    }

    // Get all existing scheduled messages for these appointments
    const agendamentoIds = agendamentos.map((a: any) => a.id);
    const { data: existingMessages } = await supabase
      .from("whatsapp_mensagens_agendadas")
      .select("agendamento_id, tipo_mensagem")
      .in("agendamento_id", agendamentoIds);

    const existingSet = new Set(
      (existingMessages || []).map((m: any) => `${m.agendamento_id}_${m.tipo_mensagem}`)
    );

    // Get whatsapp_ativo status for all clients
    const clienteIds = [...new Set(agendamentos.filter((a: any) => a.cliente_id).map((a: any) => a.cliente_id))];
    let petsMap = new Map<string, string>();
    const whatsappAtivoMap = new Map<string, boolean>();
    const petWhatsappAtivoMap = new Map<string, boolean>();

    if (clienteIds.length > 0) {
      const { data: pets } = await supabase
        .from("pets")
        .select("cliente_id, nome_pet, sexo, whatsapp_ativo")
        .in("cliente_id", clienteIds);

      if (pets) {
        for (const pet of pets) {
          petsMap.set(`${pet.cliente_id}_${pet.nome_pet}`, pet.sexo || "Macho");
          petWhatsappAtivoMap.set(`${pet.cliente_id}_${pet.nome_pet}`, pet.whatsapp_ativo !== false);
        }
      }

      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, whatsapp_ativo")
        .in("id", clienteIds);
      if (clientesData) {
        for (const c of clientesData) {
          whatsappAtivoMap.set(c.id, c.whatsapp_ativo !== false);
        }
      }
    }

    const mensagensParaInserir: any[] = [];

    for (const ag of agendamentos) {
      const agDateTime = parseDateTimeBRT(ag.data, ag.horario);
      const diffMinutes = (agDateTime.getTime() - now.getTime()) / (1000 * 60);

      // Skip if whatsapp_ativo is false for this client
      if (ag.cliente_id && whatsappAtivoMap.get(ag.cliente_id) === false) continue;

      // Skip if whatsapp_ativo is false for this pet
      if (ag.cliente_id && petWhatsappAtivoMap.get(`${ag.cliente_id}_${ag.pet}`) === false) continue;

      // Skip if appointment is in the past
      if (diffMinutes < -60) continue;

      // Skip if within 60 minutes (no auto messages)
      if (diffMinutes <= 60 && diffMinutes >= -60) continue;

      const sexoPet = petsMap.get(`${ag.cliente_id}_${ag.pet}`) || "Macho";
      const bordao = bordaoMap.get(ag.user_id) || "";
      const isPacote = !!ag.numero_servico_pacote;
      const isUltimo = isPacote && isUltimoServicoPacote(ag.numero_servico_pacote);
      const numero = formatNumero(ag.whatsapp);

      const confirmMsg = buildConfirmationMessage(
        ag.cliente, ag.pet, sexoPet, ag.data, ag.horario,
        ag.servico, ag.taxi_dog, bordao, isPacote,
        ag.numero_servico_pacote, isUltimo
      );

      const baseRecord = {
        user_id: ag.user_id,
        agendamento_id: ag.id,
        agendamento_pacote_id: null,
        servico_numero: ag.numero_servico_pacote || null,
        numero_whatsapp: numero,
        status: "pendente",
      };

      // Get confirmation config for this user
      const cc = confirmConfigMap.get(ag.user_id) || { ativo: true, h24: false, h15: false, h3: true };
      
      if (cc.ativo) {
        // === MODO PERSONALIZADO ===

        // 24h antes
        if (cc.h24 && diffMinutes > 24 * 60 && !existingSet.has(`${ag.id}_24h`)) {
          const ag24h = new Date(agDateTime.getTime() - 24 * 60 * 60 * 1000);
          if (ag24h.getTime() > now.getTime()) {
            mensagensParaInserir.push({ ...baseRecord, tipo_mensagem: "24h", mensagem: confirmMsg, agendado_para: ag24h.toISOString() });
          }
        }

        // 15h antes (máximo 18h BRT)
        if (cc.h15 && diffMinutes > 15 * 60 && !existingSet.has(`${ag.id}_15h`)) {
          let ag15h = new Date(agDateTime.getTime() - 15 * 60 * 60 * 1000);
          const brtHour15 = (ag15h.getUTCHours() - 3 + 24) % 24;
          if (brtHour15 > 18) {
            ag15h.setUTCHours(21, 0, 0, 0); // 18h BRT = 21h UTC
          }
          if (ag15h.getTime() > now.getTime()) {
            mensagensParaInserir.push({ ...baseRecord, tipo_mensagem: "15h", mensagem: confirmMsg, agendado_para: ag15h.toISOString() });
          }
        }

        // 3h antes (mínimo 07h BRT)
        if (cc.h3 && diffMinutes > 3 * 60 && !existingSet.has(`${ag.id}_3h`)) {
          let agendadoPara3h = new Date(agDateTime.getTime() - 3 * 60 * 60 * 1000);
          const brtHour3h = (agendadoPara3h.getUTCHours() - 3 + 24) % 24;
          if (brtHour3h < 7) {
            agendadoPara3h.setUTCHours(10, 0, 0, 0);
          }
          if (agendadoPara3h.getTime() > now.getTime()) {
            mensagensParaInserir.push({ ...baseRecord, tipo_mensagem: "3h", mensagem: confirmMsg, agendado_para: agendadoPara3h.toISOString() });
          }
        }

        // Confirmação imediata (entre 61min e o menor período selecionado)
        const menorPeriodoMinutos = cc.h3 ? 3 * 60 : cc.h15 ? 15 * 60 : cc.h24 ? 24 * 60 : 0;
        if (menorPeriodoMinutos > 0 && diffMinutes > 61 && diffMinutes <= menorPeriodoMinutos && !existingSet.has(`${ag.id}_imediata`) && !existingSet.has(`${ag.id}_3h`)) {
          mensagensParaInserir.push({ ...baseRecord, tipo_mensagem: "imediata", mensagem: confirmMsg, agendado_para: now.toISOString() });
        }
      } else {
        // === MODO PADRÃO (3h fixo) ===
        if (diffMinutes > 3 * 60 && !existingSet.has(`${ag.id}_3h`)) {
          let agendadoPara3h = new Date(agDateTime.getTime() - 3 * 60 * 60 * 1000);
          const brtHour3h = (agendadoPara3h.getUTCHours() - 3 + 24) % 24;
          if (brtHour3h < 7) {
            agendadoPara3h.setUTCHours(10, 0, 0, 0);
          }
          if (agendadoPara3h.getTime() > now.getTime()) {
            mensagensParaInserir.push({ ...baseRecord, tipo_mensagem: "3h", mensagem: confirmMsg, agendado_para: agendadoPara3h.toISOString() });
          }
        }

        if (diffMinutes > 61 && diffMinutes <= 3 * 60 && !existingSet.has(`${ag.id}_3h`)) {
          mensagensParaInserir.push({ ...baseRecord, tipo_mensagem: "3h", mensagem: confirmMsg, agendado_para: now.toISOString() });
        }
      }

      // === 30min message (always active, only if Taxi Dog = "Não") ===
      if (ag.taxi_dog === "Não" && diffMinutes > 30 && !existingSet.has(`${ag.id}_30min`)) {
        const agendadoPara30min = new Date(agDateTime.getTime() - 30 * 60 * 1000);
        const brtH30 = (agendadoPara30min.getUTCHours() - 3 + 24) % 24;
        if (brtH30 < 7) agendadoPara30min.setUTCHours(10, 0, 0, 0);
        if (agendadoPara30min.getTime() > now.getTime()) {
          const reminderMsg = buildReminderMessage(ag.cliente, ag.pet, sexoPet, ag.horario);
          mensagensParaInserir.push({ ...baseRecord, tipo_mensagem: "30min", mensagem: reminderMsg, agendado_para: agendadoPara30min.toISOString() });
        }
      }
    }

    // Also handle pacotes
    await autoCreatePacoteMessages(supabase, activeUserIds, bordaoMap, now, todayBRT, tomorrowBRT);

    if (mensagensParaInserir.length > 0) {
      const { error } = await supabase
        .from("whatsapp_mensagens_agendadas")
        .insert(mensagensParaInserir);

      if (error) {
        console.error("Error inserting auto-created messages:", error);
      } else {
        console.log(`Auto-created ${mensagensParaInserir.length} messages for avulso appointments`);
      }
    }
  } catch (err) {
    console.error("Error in autoCreateMissingMessages:", err);
  }
}

async function autoCreatePacoteMessages(
  supabase: any,
  activeUserIds: string[],
  bordaoMap: Map<string, string>,
  now: Date,
  todayBRT: string,
  tomorrowBRT: string
) {
  try {
    const { data: pacotes } = await supabase
      .from("agendamentos_pacotes")
      .select("id, user_id, nome_cliente, nome_pet, raca, whatsapp, servicos, taxi_dog")
      .in("user_id", activeUserIds);

    if (!pacotes || pacotes.length === 0) return;

    // Get existing messages for pacotes
    const pacoteIds = pacotes.map((p: any) => p.id);
    const { data: existingPacoteMsgs } = await supabase
      .from("whatsapp_mensagens_agendadas")
      .select("agendamento_pacote_id, servico_numero, tipo_mensagem")
      .in("agendamento_pacote_id", pacoteIds);

    const existingPacoteSet = new Set(
      (existingPacoteMsgs || []).map((m: any) => `${m.agendamento_pacote_id}_${m.servico_numero}_${m.tipo_mensagem}`)
    );

    // Get pet sexo and whatsapp_ativo
    const petSexoMap = new Map<string, string>();
    const petWhatsappAtivoPacoteMap = new Map<string, boolean>();
    for (const userId of activeUserIds) {
      const { data: pets } = await supabase
        .from("pets")
        .select("nome_pet, sexo, whatsapp_ativo")
        .eq("user_id", userId);
      if (pets) {
        for (const pet of pets) {
          petSexoMap.set(`${userId}_${pet.nome_pet}`, pet.sexo || "Macho");
          petWhatsappAtivoPacoteMap.set(`${userId}_${pet.nome_pet}`, pet.whatsapp_ativo !== false);
        }
      }
    }

    // Get whatsapp_ativo by client name per user
    const whatsappAtivoPacoteMap = new Map<string, boolean>();
    for (const userId of activeUserIds) {
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("nome_cliente, whatsapp_ativo")
        .eq("user_id", userId);
      if (clientesData) {
        for (const c of clientesData) {
          whatsappAtivoPacoteMap.set(`${userId}_${c.nome_cliente}`, c.whatsapp_ativo !== false);
        }
      }
    }

    const mensagensParaInserir: any[] = [];

    for (const pacote of pacotes) {
      // Skip if whatsapp_ativo is false for client
      if (whatsappAtivoPacoteMap.get(`${pacote.user_id}_${pacote.nome_cliente}`) === false) continue;

      // Skip if whatsapp_ativo is false for pet
      if (petWhatsappAtivoPacoteMap.get(`${pacote.user_id}_${pacote.nome_pet}`) === false) continue;

      const servicos = pacote.servicos as any[];
      if (!servicos || !Array.isArray(servicos)) continue;

      const totalServicos = servicos.length;

      for (let i = 0; i < servicos.length; i++) {
        const sv = servicos[i];
        if (!sv.data || !sv.horarioInicio) continue;
        if (sv.data !== todayBRT && sv.data !== tomorrowBRT) continue;
        if (sv.status === "Cancelado") continue;

        const agDateTime = parseDateTimeBRT(sv.data, sv.horarioInicio);
        const diffMinutes = (agDateTime.getTime() - now.getTime()) / (1000 * 60);

        if (diffMinutes < -60) continue;
        if (diffMinutes <= 60 && diffMinutes >= -60) continue;

        const servicoNumero = sv.numero || `${String(i + 1).padStart(2, "0")}/${String(totalServicos).padStart(2, "0")}`;
        const isUltimo = isUltimoServicoPacote(servicoNumero);
        const sexoPet = petSexoMap.get(`${pacote.user_id}_${pacote.nome_pet}`) || "Macho";
        const bordao = bordaoMap.get(pacote.user_id) || "";
        const numero = formatNumero(pacote.whatsapp);
        const servicoNome = sv.nomeServico || sv.servico || sv.nome || "Banho";

        const confirmMsg = buildConfirmationMessage(
          pacote.nome_cliente, pacote.nome_pet, sexoPet, sv.data, sv.horarioInicio,
          servicoNome, pacote.taxi_dog, bordao, true, servicoNumero, isUltimo
        );

        const baseRecord = {
          user_id: pacote.user_id,
          agendamento_id: null,
          agendamento_pacote_id: pacote.id,
          servico_numero: servicoNumero,
          numero_whatsapp: numero,
          status: "pendente",
        };

        const key = `${pacote.id}_${servicoNumero}`;

        // === 3h ===
        if (diffMinutes > 3 * 60 && !existingPacoteSet.has(`${key}_3h`)) {
          let ag3h = new Date(agDateTime.getTime() - 3 * 60 * 60 * 1000);
          // Garantir que não envie antes das 07:00 BRT
          const brtH3 = (ag3h.getUTCHours() - 3 + 24) % 24;
          if (brtH3 < 7) ag3h.setUTCHours(10, 0, 0, 0);
          if (ag3h.getTime() > now.getTime()) {
            mensagensParaInserir.push({ ...baseRecord, tipo_mensagem: "3h", mensagem: confirmMsg, agendado_para: ag3h.toISOString() });
          }
        }

        // === 30min ===
        if (pacote.taxi_dog === "Não" && diffMinutes > 30 && !existingPacoteSet.has(`${key}_30min`)) {
          const ag30 = new Date(agDateTime.getTime() - 30 * 60 * 1000);
          // Garantir que não envie antes das 07:00 BRT
          const brtH30p = (ag30.getUTCHours() - 3 + 24) % 24;
          if (brtH30p < 7) ag30.setUTCHours(10, 0, 0, 0);
          if (ag30.getTime() > now.getTime()) {
            const reminderMsg = buildReminderMessage(pacote.nome_cliente, pacote.nome_pet, sexoPet, sv.horarioInicio);
            mensagensParaInserir.push({ ...baseRecord, tipo_mensagem: "30min", mensagem: reminderMsg, agendado_para: ag30.toISOString() });
          }
        }

        // === Confirmation for 61min-3h (auto-create only, NOT imediata) ===
        if (diffMinutes > 61 && diffMinutes <= 3 * 60 && !existingPacoteSet.has(`${key}_3h`)) {
          mensagensParaInserir.push({ ...baseRecord, tipo_mensagem: "3h", mensagem: confirmMsg, agendado_para: now.toISOString() });
        }
      }
    }

    if (mensagensParaInserir.length > 0) {
      const { error } = await supabase
        .from("whatsapp_mensagens_agendadas")
        .insert(mensagensParaInserir);

      if (error) {
        console.error("Error inserting auto-created pacote messages:", error);
      } else {
        console.log(`Auto-created ${mensagensParaInserir.length} messages for pacote appointments`);
      }
    }
  } catch (err) {
    console.error("Error in autoCreatePacoteMessages:", err);
  }
}
