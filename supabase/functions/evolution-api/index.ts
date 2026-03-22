import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function evolutionFetch(path: string, method = "GET", body?: unknown) {
  const baseUrl = Deno.env.get("EVOLUTION_API_URL")!;
  const apiKey = Deno.env.get("EVOLUTION_API_KEY")!;

  const url = `${baseUrl}${path}`;
  const opts: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { action, instanceName, number, number: toNumber, text } = body;

    switch (action) {
      case "create-instance": {
        if (!instanceName || !number) {
          return json({ error: "instanceName e number são obrigatórios" }, 400);
        }

        const result = await evolutionFetch("/instance/create", "POST", {
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          number,
          qrcode: true,
          rejectCall: false,
        });

        if (!result.ok) {
          const msg = result.data?.response?.message?.[0] || result.data?.message || "Erro ao criar instância";
          return json({ error: msg }, result.status);
        }

        return json(result.data);
      }

      case "get-qrcode": {
        if (!instanceName) {
          return json({ error: "instanceName é obrigatório" }, 400);
        }

        const result = await evolutionFetch(`/instance/connect/${instanceName}`, "GET");

        if (!result.ok) {
          return json({ error: "Erro ao buscar QR Code" }, result.status);
        }

        return json(result.data);
      }

      case "check-status": {
        if (!instanceName) {
          return json({ error: "instanceName é obrigatório" }, 400);
        }

        const result = await evolutionFetch(`/instance/connectionState/${instanceName}`, "GET");

        if (!result.ok) {
          return json({ error: "Erro ao verificar status", details: result.data }, result.status);
        }

        return json(result.data);
      }

      case "disconnect": {
        if (!instanceName) {
          return json({ error: "instanceName é obrigatório" }, 400);
        }

        // Logout first
        await evolutionFetch(`/instance/logout/${instanceName}`, "DELETE");
        // Then delete
        await evolutionFetch(`/instance/delete/${instanceName}`, "DELETE");

        return json({ success: true });
      }

      case "send-message": {
        if (!instanceName || !toNumber || !text) {
        if (!instanceName || !toNumber || !text) {
          return json({ error: "instanceName, number e text são obrigatórios" }, 400);
        }

        const result = await evolutionFetch(`/message/sendText/${instanceName}`, "POST", {
          number: toNumber,
          text,
        });

        if (!result.ok) {
          return json({ error: "Erro ao enviar mensagem" }, result.status);
        }

        return json(result.data);
      }

      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (err) {
    console.error("Evolution API error:", err);
    return json({ error: err.message || "Erro interno" }, 500);
  }
});
