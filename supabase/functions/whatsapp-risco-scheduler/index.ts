import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

// Monta a string "o Theo, a Amora, a Meg"
function montarListaPets(pets: { nome_pet: string; sexo: string | null }[]): string {
  return pets
    .map((p) => {
      const artigo = p.sexo?.toLowerCase() === "fêmea" || p.sexo?.toLowerCase() === "femea" ? "a" : "o";
      return `${artigo} ${p.nome_pet}`;
    })
    .join(", ");
}

// Mensagem unificada (template provisório — será substituído quando o usuário enviar os templates por faixa)
function gerarMensagemRisco(
  primeiroNome: string,
  pets: { nome_pet: string; sexo: string | null; dias_sem_agendar: number }[]
): string {
  const listaPets = montarListaPets(pets);

  // Usa o maior número de dias entre os pets para classificar
  const maxDias = Math.max(...pets.map((p) => p.dias_sem_agendar));

  if (maxDias >= 7 && maxDias <= 10) {
    return `Oi, ${primeiroNome}!\n\nSeparei alguns horários especiais essa semana e lembrei de vocês 😊\n\n${listaPets} já ${pets.length === 1 ? "está" : "estão"} na hora daquele banho caprichado 🛁✨ Quer que eu garanta um horário pra você?`;
  }

  if (maxDias >= 11 && maxDias <= 15) {
    return `Oii, ${primeiroNome}!\n\nJá faz um tempinho desde o último banho. ${listaPets} ${pets.length === 1 ? "está" : "estão"} precisando de um cuidado especial 🐾\n\nVamos marcar pra essa semana?`;
  }

  if (maxDias >= 16 && maxDias <= 20) {
    return `Olá, ${primeiroNome}!\n\nJá faz um bom tempo que ${listaPets} não ${pets.length === 1 ? "vem" : "vêm"} nos visitar 🐶\n\nVamos agendar o próximo banho e colocar os cuidados em dia?`;
  }

  if (maxDias >= 21 && maxDias <= 30) {
    return `Olá, ${primeiroNome}!\n\nJá faz quase um mês! ${listaPets} ${pets.length === 1 ? "merece" : "merecem"} aquele banho caprichado 🛁✨\n\nQue tal agendar um novo horário?`;
  }

  if (maxDias >= 31 && maxDias <= 45) {
    return `Oii, ${primeiroNome}!\n\n${listaPets} ${pets.length === 1 ? "está" : "estão"} há bastante tempo sem vir nos visitar. Temos horários disponíveis nesta semana 📅\n\nVamos marcar?`;
  }

  if (maxDias >= 46 && maxDias <= 90) {
    return `Olá, ${primeiroNome}!\n\nJá faz bastante tempo que ${listaPets} não ${pets.length === 1 ? "vem" : "vêm"} ao nosso espaço. Sentimos falta! 💛\n\nQue tal agendar um banho especial?`;
  }

  // > 90 dias
  return `Olá, ${primeiroNome}! Tudo bem?\n\nFaz muito tempo que ${listaPets} não nos visita. Adoraríamos recebê-${pets.length === 1 ? "lo" : "los"} novamente! 🐾\n\nPosso reservar um horário especial?`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = hoje.toISOString().split("T")[0];

    // Buscar todas as instâncias de WhatsApp ativas
    const { data: instances } = await supabase
      .from("whatsapp_instances")
      .select("user_id, instance_name, status")
      .eq("status", "open");

    if (!instances || instances.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma instância ativa" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalEnviadas = 0;
    let totalErros = 0;

    for (const instance of instances) {
      const userId = instance.user_id;

      // Verificar se auto_send está ativo
      const { data: config } = await supabase
        .from("empresa_config")
        .select("evolution_auto_send")
        .eq("user_id", userId)
        .single();

      if (!config?.evolution_auto_send) continue;

      // Buscar todos os agendamentos do usuário (paginados)
      const allAgendamentos: any[] = [];
      let page = 0;
      while (true) {
        const { data, error } = await supabase
          .from("agendamentos")
          .select("cliente_id, cliente, data, pet, whatsapp")
          .eq("user_id", userId)
          .order("data", { ascending: false })
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) throw error;
        if (data) allAgendamentos.push(...data);
        if (!data || data.length < 1000) break;
        page++;
      }

      // Buscar todos os pacotes do usuário (paginados)
      const allPacotes: any[] = [];
      page = 0;
      while (true) {
        const { data, error } = await supabase
          .from("agendamentos_pacotes")
          .select("id, nome_cliente, data_venda, nome_pet, whatsapp, servicos")
          .eq("user_id", userId)
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) throw error;
        if (data) allPacotes.push(...data);
        if (!data || data.length < 1000) break;
        page++;
      }

      // Buscar clientes com whatsapp_ativo
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nome_cliente, whatsapp, whatsapp_ativo")
        .eq("user_id", userId);

      if (!clientes) continue;

      // Buscar pets com whatsapp_ativo e sexo
      const { data: allPets } = await supabase
        .from("pets")
        .select("id, cliente_id, nome_pet, sexo, whatsapp_ativo")
        .eq("user_id", userId);

      if (!allPets) continue;

      // Mapear clientes por id
      const clienteMap = new Map(clientes.map((c) => [c.id, c]));

      // Construir mapa de último agendamento por cliente_id + pet
      const ultimoAgendamento = new Map<string, { data: Date; clienteId: string; nomePet: string; whatsapp: string }>();

      const parseData = (str: string) => {
        const d = new Date(str + "T00:00:00");
        return isNaN(d.getTime()) ? null : d;
      };

      for (const a of allAgendamentos) {
        const d = parseData(a.data);
        if (!d || !a.cliente_id) continue;
        const chave = `${a.cliente_id}_${a.pet}`;
        const existente = ultimoAgendamento.get(chave);
        if (!existente || d > existente.data) {
          ultimoAgendamento.set(chave, { data: d, clienteId: a.cliente_id, nomePet: a.pet, whatsapp: a.whatsapp });
        }
      }

      for (const p of allPacotes) {
        // Tentar encontrar o cliente_id pelo nome
        const clienteMatch = clientes.find((c) => c.nome_cliente === p.nome_cliente);
        if (!clienteMatch) continue;

        let ultimaData: Date | null = null;
        try {
          const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
          if (Array.isArray(servicos)) {
            for (const s of servicos) {
              const d = parseData(s.data);
              if (d && (!ultimaData || d > ultimaData)) ultimaData = d;
            }
          }
        } catch {}

        const dataFinal = ultimaData || parseData(p.data_venda);
        if (!dataFinal) continue;

        const chave = `${clienteMatch.id}_${p.nome_pet}`;
        const existente = ultimoAgendamento.get(chave);
        if (!existente || dataFinal > existente.data) {
          ultimoAgendamento.set(chave, { data: dataFinal, clienteId: clienteMatch.id, nomePet: p.nome_pet, whatsapp: p.whatsapp });
        }
      }

      // Verificar agendamentos futuros por chave
      const temFuturo = new Set<string>();
      for (const a of allAgendamentos) {
        if (!a.cliente_id) continue;
        const d = parseData(a.data);
        if (d && d >= hoje) {
          temFuturo.add(`${a.cliente_id}_${a.pet}`);
        }
      }
      for (const p of allPacotes) {
        const clienteMatch = clientes.find((c) => c.nome_cliente === p.nome_cliente);
        if (!clienteMatch) continue;
        try {
          const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
          if (Array.isArray(servicos)) {
            for (const s of servicos) {
              const d = parseData(s.data);
              if (d && d >= hoje) {
                temFuturo.add(`${clienteMatch.id}_${p.nome_pet}`);
              }
            }
          }
        } catch {}
      }

      // Agrupar pets em risco por cliente_id
      const clientesPetsRisco = new Map<string, { clienteId: string; pets: { nome_pet: string; sexo: string | null; dias_sem_agendar: number }[]; whatsapp: string }>();

      for (const [chave, info] of ultimoAgendamento.entries()) {
        if (temFuturo.has(chave)) continue;

        const dias = Math.floor((hoje.getTime() - info.data.getTime()) / (1000 * 60 * 60 * 24));
        if (dias < 7) continue;

        const cliente = clienteMap.get(info.clienteId);
        if (!cliente || !cliente.whatsapp_ativo) continue;

        // Verificar toggle do pet
        const petRecord = allPets.find((p) => p.cliente_id === info.clienteId && p.nome_pet === info.nomePet);
        if (petRecord && !petRecord.whatsapp_ativo) continue;

        const grupo = clientesPetsRisco.get(info.clienteId);
        const petInfo = { nome_pet: info.nomePet, sexo: petRecord?.sexo || null, dias_sem_agendar: dias };

        if (grupo) {
          grupo.pets.push(petInfo);
        } else {
          clientesPetsRisco.set(info.clienteId, {
            clienteId: info.clienteId,
            pets: [petInfo],
            whatsapp: info.whatsapp || cliente.whatsapp,
          });
        }
      }

      // Verificar quais já receberam mensagem hoje
      const { data: jaEnviadas } = await supabase
        .from("whatsapp_mensagens_risco")
        .select("cliente_id")
        .eq("user_id", userId)
        .gte("created_at", hojeStr + "T00:00:00.000Z")
        .in("status", ["pendente", "enviado"]);

      const jaEnviadasSet = new Set((jaEnviadas || []).map((r: any) => r.cliente_id));

      // Enviar mensagens
      for (const [clienteId, grupo] of clientesPetsRisco.entries()) {
        if (jaEnviadasSet.has(clienteId)) continue;

        const cliente = clienteMap.get(clienteId);
        if (!cliente) continue;

        const primeiroNome = cliente.nome_cliente.split(" ")[0];
        const mensagem = gerarMensagemRisco(primeiroNome, grupo.pets);

        const numeroLimpo = grupo.whatsapp.replace(/\D/g, "");
        const numeroCompleto = numeroLimpo.startsWith("55") ? numeroLimpo : `55${numeroLimpo}`;

        // Inserir registro na tabela de controle
        const { data: registro, error: insertErr } = await supabase
          .from("whatsapp_mensagens_risco")
          .insert({
            user_id: userId,
            cliente_id: clienteId,
            pets_incluidos: grupo.pets,
            mensagem,
            numero_whatsapp: numeroCompleto,
            status: "pendente",
            agendado_para: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertErr || !registro) {
          console.error(`Erro ao inserir registro risco para ${clienteId}:`, insertErr);
          totalErros++;
          continue;
        }

        try {
          await enviarMensagemEvolution(instance.instance_name, numeroCompleto, mensagem);

          await supabase
            .from("whatsapp_mensagens_risco")
            .update({ status: "enviado", enviado_em: new Date().toISOString() })
            .eq("id", registro.id);

          totalEnviadas++;
          console.log(`✅ Mensagem risco enviada para ${cliente.nome_cliente} (${grupo.pets.length} pets)`);
        } catch (err) {
          const erroMsg = err instanceof Error ? err.message : String(err);
          await supabase
            .from("whatsapp_mensagens_risco")
            .update({ status: "erro", erro: erroMsg })
            .eq("id", registro.id);

          totalErros++;
          console.error(`❌ Erro ao enviar risco para ${cliente.nome_cliente}:`, erroMsg);
        }

        // Intervalo entre envios
        await sleep(10000);
      }
    }

    return new Response(
      JSON.stringify({ success: true, enviadas: totalEnviadas, erros: totalErros }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro geral whatsapp-risco-scheduler:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
