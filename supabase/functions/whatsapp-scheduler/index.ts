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
      .select("user_id, evolution_auto_send, bordao")
      .in("user_id", userIds);

    const autoSendEnabled = new Set(
      (empresaConfigs || [])
        .filter((e: any) => e.evolution_auto_send === true)
        .map((e: any) => e.user_id)
    );

    const bordaoMap = new Map<string, string>();
    for (const ec of (empresaConfigs || [])) {
      bordaoMap.set(ec.user_id, ec.bordao || "");
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
    await autoCreateMissingMessages(supabase, activeUserIds, bordaoMap, now);

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

    let enviados = 0;
    let falhas = 0;

    for (const msg of mensagens as MensagemAgendada[]) {
      const instanceName = instanceMap.get(msg.user_id);
      if (!instanceName || !msg.mensagem) {
        await supabase
          .from("whatsapp_mensagens_agendadas")
          .update({ status: "falha", erro: "Instância não encontrada ou mensagem vazia" })
          .eq("id", msg.id);
        falhas++;
        continue;
      }

      try {
        await enviarMensagemEvolution(instanceName, msg.numero_whatsapp, msg.mensagem);
        
        await supabase
          .from("whatsapp_mensagens_agendadas")
          .update({ status: "enviado", enviado_em: new Date().toISOString() })
          .eq("id", msg.id);
        
        enviados++;
        
        if (enviados < mensagens.length) {
          await sleep(10000);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
        console.error(`Failed to send message ${msg.id}:`, errorMsg);
        
        await supabase
          .from("whatsapp_mensagens_agendadas")
          .update({ status: "falha", erro: errorMsg })
          .eq("id", msg.id);
        
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

    // Get pet sexo for all clients
    const clienteIds = [...new Set(agendamentos.filter((a: any) => a.cliente_id).map((a: any) => a.cliente_id))];
    let petsMap = new Map<string, string>(); // cliente_id -> sexo

    if (clienteIds.length > 0) {
      const { data: pets } = await supabase
        .from("pets")
        .select("cliente_id, nome_pet, sexo")
        .in("cliente_id", clienteIds);

      if (pets) {
        for (const pet of pets) {
          // Map by cliente_id + pet name for better matching
          petsMap.set(`${pet.cliente_id}_${pet.nome_pet}`, pet.sexo || "Macho");
        }
      }
    }

    const mensagensParaInserir: any[] = [];

    for (const ag of agendamentos) {
      const agDateTime = parseDateTimeBRT(ag.data, ag.horario);
      const diffMinutes = (agDateTime.getTime() - now.getTime()) / (1000 * 60);

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

      // === 24h message ===
      if (diffMinutes > 24 * 60 && !existingSet.has(`${ag.id}_24h`)) {
        const agendadoPara24h = new Date(agDateTime.getTime() - 24 * 60 * 60 * 1000);
        const brtHour24 = (agendadoPara24h.getUTCHours() - 3 + 24) % 24;
        if (brtHour24 < 7) {
          agendadoPara24h.setUTCHours(10, 0, 0, 0); // 7h BRT
        }
        if (agendadoPara24h.getTime() > now.getTime()) {
          mensagensParaInserir.push({
            ...baseRecord,
            tipo_mensagem: "24h",
            mensagem: confirmMsg,
            agendado_para: agendadoPara24h.toISOString(),
          });
        }
      }

      // === 3h message ===
      if (diffMinutes > 3 * 60 && !existingSet.has(`${ag.id}_3h`)) {
        let agendadoPara3h = new Date(agDateTime.getTime() - 3 * 60 * 60 * 1000);
        const horaAgBRT = ((agDateTime.getUTCHours() - 3 + 24) % 24);
        if (horaAgBRT < 10) {
          agendadoPara3h = new Date(agDateTime);
          agendadoPara3h.setUTCHours(10, 0, 0, 0); // 7h BRT
        }
        if (agendadoPara3h.getTime() > now.getTime()) {
          mensagensParaInserir.push({
            ...baseRecord,
            tipo_mensagem: "3h",
            mensagem: confirmMsg,
            agendado_para: agendadoPara3h.toISOString(),
          });
        }
      }

      // === 30min message (only if Taxi Dog = Não) ===
      if (ag.taxi_dog === "Não" && diffMinutes > 30 && !existingSet.has(`${ag.id}_30min`)) {
        const agendadoPara30min = new Date(agDateTime.getTime() - 30 * 60 * 1000);
        if (agendadoPara30min.getTime() > now.getTime()) {
          const reminderMsg = buildReminderMessage(ag.cliente, ag.pet, sexoPet, ag.horario);
          mensagensParaInserir.push({
            ...baseRecord,
            tipo_mensagem: "30min",
            mensagem: reminderMsg,
            agendado_para: agendadoPara30min.toISOString(),
          });
        }
      }

      // === Immediate message (>61min, <=24h, Taxi Dog = Não) ===
      if (diffMinutes > 61 && diffMinutes <= 24 * 60 && ag.taxi_dog === "Não" && !existingSet.has(`${ag.id}_imediata`)) {
        const reminderMsg = buildReminderMessage(ag.cliente, ag.pet, sexoPet, ag.horario);
        mensagensParaInserir.push({
          ...baseRecord,
          tipo_mensagem: "imediata",
          mensagem: reminderMsg,
          agendado_para: now.toISOString(),
        });
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

    // Get pet sexo
    const clienteNames = [...new Set(pacotes.map((p: any) => p.nome_pet))];
    // We'll try to find pets by name for each user
    const petSexoMap = new Map<string, string>();
    for (const userId of activeUserIds) {
      const { data: pets } = await supabase
        .from("pets")
        .select("nome_pet, sexo")
        .eq("user_id", userId);
      if (pets) {
        for (const pet of pets) {
          petSexoMap.set(`${userId}_${pet.nome_pet}`, pet.sexo || "Macho");
        }
      }
    }

    const mensagensParaInserir: any[] = [];

    for (const pacote of pacotes) {
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
        const servicoNome = sv.servico || sv.nome || "Banho";

        const confirmMsg = buildConfirmationMessage(
          pacote.nome_cliente, pacote.nome_pet, sexoPet, sv.data, sv.horario,
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

        // === 24h ===
        if (diffMinutes > 24 * 60 && !existingPacoteSet.has(`${key}_24h`)) {
          const ag24h = new Date(agDateTime.getTime() - 24 * 60 * 60 * 1000);
          const brtH = (ag24h.getUTCHours() - 3 + 24) % 24;
          if (brtH < 7) ag24h.setUTCHours(10, 0, 0, 0);
          if (ag24h.getTime() > now.getTime()) {
            mensagensParaInserir.push({ ...baseRecord, tipo_mensagem: "24h", mensagem: confirmMsg, agendado_para: ag24h.toISOString() });
          }
        }

        // === 3h ===
        if (diffMinutes > 3 * 60 && !existingPacoteSet.has(`${key}_3h`)) {
          let ag3h = new Date(agDateTime.getTime() - 3 * 60 * 60 * 1000);
          const horaAgBRT = ((agDateTime.getUTCHours() - 3 + 24) % 24);
          if (horaAgBRT < 10) {
            ag3h = new Date(agDateTime);
            ag3h.setUTCHours(10, 0, 0, 0);
          }
          if (ag3h.getTime() > now.getTime()) {
            mensagensParaInserir.push({ ...baseRecord, tipo_mensagem: "3h", mensagem: confirmMsg, agendado_para: ag3h.toISOString() });
          }
        }

        // === 30min ===
        if (pacote.taxi_dog === "Não" && diffMinutes > 30 && !existingPacoteSet.has(`${key}_30min`)) {
          const ag30 = new Date(agDateTime.getTime() - 30 * 60 * 1000);
          if (ag30.getTime() > now.getTime()) {
            const reminderMsg = buildReminderMessage(pacote.nome_cliente, pacote.nome_pet, sexoPet, sv.horario);
            mensagensParaInserir.push({ ...baseRecord, tipo_mensagem: "30min", mensagem: reminderMsg, agendado_para: ag30.toISOString() });
          }
        }

        // === Imediata ===
        if (diffMinutes > 61 && diffMinutes <= 24 * 60 && pacote.taxi_dog === "Não" && !existingPacoteSet.has(`${key}_imediata`)) {
          const reminderMsg = buildReminderMessage(pacote.nome_cliente, pacote.nome_pet, sexoPet, sv.horario);
          mensagensParaInserir.push({ ...baseRecord, tipo_mensagem: "imediata", mensagem: reminderMsg, agendado_para: now.toISOString() });
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
