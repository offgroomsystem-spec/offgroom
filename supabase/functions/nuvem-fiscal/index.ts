import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NUVEM_FISCAL_API = "https://api.sandbox.nuvemfiscal.com.br";
const NUVEM_FISCAL_AUTH = "https://auth.sandbox.nuvemfiscal.com.br/oauth/token";

// Simple in-memory token cache
let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getOAuthToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60000) {
    return cachedToken.access_token;
  }

  const clientId = Deno.env.get("NUVEM_FISCAL_CLIENT_ID");
  const clientSecret = Deno.env.get("NUVEM_FISCAL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Credenciais da Nuvem Fiscal não configuradas");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "empresa nfe nfse cep",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(NUVEM_FISCAL_AUTH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Erro ao obter token OAuth: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

async function nuvemFiscalRequest(
  method: string,
  path: string,
  body?: unknown,
  responseType: "json" | "blob" = "json"
): Promise<{ status: number; data: unknown }> {
  const token = await getOAuthToken();

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: responseType === "blob" ? "application/pdf" : "application/json",
    },
  };

  if (body && ["POST", "PUT", "PATCH"].includes(method)) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${NUVEM_FISCAL_API}${path}`, options);

  if (responseType === "blob" && res.ok) {
    const arrayBuffer = await res.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return { status: res.status, data: { base64, contentType: res.headers.get("content-type") } };
  }

  const data = res.ok || res.status === 400 || res.status === 422
    ? await res.json()
    : { error: await res.text() };

  return { status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Get effective user id for staff support
    const { data: effectiveData } = await supabase.rpc("get_effective_user_id", {
      _auth_user_id: userId,
    });
    const effectiveUserId = effectiveData || userId;

    const { action, ...params } = await req.json();

    let result: { status: number; data: unknown };

    switch (action) {
      case "cadastrar_empresa": {
        result = await nuvemFiscalRequest("POST", "/empresas", params.payload);
        break;
      }

      case "consultar_empresa": {
        const cnpj = params.cnpj?.replace(/\D/g, "");
        result = await nuvemFiscalRequest("GET", `/empresas/${cnpj}`);
        break;
      }

      case "emitir_nfe": {
        result = await nuvemFiscalRequest("POST", "/nfe", params.payload);

        // Save to database
        if (result.status >= 200 && result.status < 300) {
          const nfeData = result.data as Record<string, unknown>;
          await supabase.from("notas_fiscais").insert({
            user_id: effectiveUserId,
            tipo: "NFe",
            nuvem_fiscal_id: nfeData.id,
            status: "processando",
            valor_total: params.valor_total || 0,
            cliente_id: params.cliente_id,
            cliente_nome: params.cliente_nome,
            cliente_documento: params.cliente_documento,
            dados_nfe: nfeData,
          });
        }
        break;
      }

      case "emitir_nfse": {
        result = await nuvemFiscalRequest("POST", "/nfse", params.payload);

        if (result.status >= 200 && result.status < 300) {
          const nfseData = result.data as Record<string, unknown>;
          await supabase.from("notas_fiscais").insert({
            user_id: effectiveUserId,
            tipo: "NFSe",
            nuvem_fiscal_id: nfseData.id,
            status: "processando",
            valor_total: params.valor_total || 0,
            cliente_id: params.cliente_id,
            cliente_nome: params.cliente_nome,
            cliente_documento: params.cliente_documento,
            dados_nfse: nfseData,
          });
        }
        break;
      }

      case "consultar_nfe": {
        result = await nuvemFiscalRequest("GET", `/nfe/${params.id}`);

        // Update local record
        if (result.status === 200) {
          const nfeData = result.data as Record<string, unknown>;
          const statusMap: Record<string, string> = {
            autorizada: "autorizada",
            rejeitada: "rejeitada",
            cancelada: "cancelada",
            processando: "processando",
          };
          const newStatus = statusMap[nfeData.status as string] || "processando";

          await supabase
            .from("notas_fiscais")
            .update({
              status: newStatus,
              numero: nfeData.numero as string,
              serie: nfeData.serie as string,
              dados_nfe: nfeData,
              mensagem_erro: nfeData.motivo_rejeicao as string || null,
            })
            .eq("nuvem_fiscal_id", params.id);
        }
        break;
      }

      case "consultar_nfse": {
        result = await nuvemFiscalRequest("GET", `/nfse/${params.id}`);

        if (result.status === 200) {
          const nfseData = result.data as Record<string, unknown>;
          const statusMap: Record<string, string> = {
            autorizada: "autorizada",
            rejeitada: "rejeitada",
            cancelada: "cancelada",
            processando: "processando",
          };
          const newStatus = statusMap[nfseData.status as string] || "processando";

          await supabase
            .from("notas_fiscais")
            .update({
              status: newStatus,
              numero: nfseData.numero as string,
              dados_nfse: nfseData,
              mensagem_erro: nfseData.motivo_rejeicao as string || null,
            })
            .eq("nuvem_fiscal_id", params.id);
        }
        break;
      }

      case "baixar_pdf_nfe": {
        result = await nuvemFiscalRequest("GET", `/nfe/${params.id}/pdf`, undefined, "blob");
        break;
      }

      case "baixar_pdf_nfse": {
        result = await nuvemFiscalRequest("GET", `/nfse/${params.id}/pdf`, undefined, "blob");
        break;
      }

      case "cancelar_nfe": {
        result = await nuvemFiscalRequest("POST", `/nfe/${params.id}/cancelamento`, params.payload);

        if (result.status >= 200 && result.status < 300) {
          await supabase
            .from("notas_fiscais")
            .update({ status: "cancelada" })
            .eq("nuvem_fiscal_id", params.id);
        }
        break;
      }

      case "cancelar_nfse": {
        result = await nuvemFiscalRequest("POST", `/nfse/${params.id}/cancelamento`, params.payload);

        if (result.status >= 200 && result.status < 300) {
          await supabase
            .from("notas_fiscais")
            .update({ status: "cancelada" })
            .eq("nuvem_fiscal_id", params.id);
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Ação desconhecida: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na edge function nuvem-fiscal:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
