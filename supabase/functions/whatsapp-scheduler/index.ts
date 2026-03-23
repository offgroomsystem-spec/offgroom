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
      .select("user_id, evolution_auto_send")
      .in("user_id", userIds);

    const autoSendEnabled = new Set(
      (empresaConfigs || [])
        .filter((e: any) => e.evolution_auto_send === true)
        .map((e: any) => e.user_id)
    );

    // Filter only instances with auto_send enabled
    const activeInstances = instances.filter((i: WhatsAppInstance) => autoSendEnabled.has(i.user_id));

    if (activeInstances.length === 0) {
      return new Response(JSON.stringify({ message: "No instances with auto-send enabled" }), { headers: corsHeaders });
    }

    // 3. Buscar mensagens pendentes cujo agendado_para <= now
    const activeUserIds = activeInstances.map((i: WhatsAppInstance) => i.user_id);
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
      return new Response(JSON.stringify({ message: "No pending messages" }), { headers: corsHeaders });
    }

    const instanceMap = new Map<string, string>();
    for (const inst of activeInstances) {
      instanceMap.set(inst.user_id, inst.instance_name);
    }

    let enviados = 0;
    let falhas = 0;

    for (const msg of mensagens as MensagemAgendada[]) {
      const instanceName = instanceMap.get(msg.user_id);
      if (!instanceName || !msg.mensagem) {
        // Mark as failed if no instance
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
        
        // Intervalo de 10 segundos entre mensagens
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
