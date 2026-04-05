import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ADMIN_EMAIL = 'offgroom.system@gmail.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate and verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    if (userData.user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { action, params } = await req.json();

    switch (action) {
      case 'dashboard': {
        // Get all profiles with subscription info
        const { data: profiles, count: totalUsers } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact' });

        const { count: totalPets } = await supabaseAdmin
          .from('pets')
          .select('*', { count: 'exact', head: true });

        const { count: totalAgendamentos } = await supabaseAdmin
          .from('agendamentos')
          .select('*', { count: 'exact', head: true });

        // Active users (logged in last 30 days) - based on updated_at
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: activeUsers } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('updated_at', thirtyDaysAgo.toISOString());

        // Users with active subscriptions
        const { count: paidUsers } = await supabaseAdmin
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // New users this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: newUsersMonth } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString());

        // Growth data (users per month, last 12 months)
        const growthData = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
          const { count } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', start)
            .lte('created_at', end);
          growthData.push({
            month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            count: count || 0
          });
        }

        return new Response(JSON.stringify({
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          totalPets: totalPets || 0,
          totalAgendamentos: totalAgendamentos || 0,
          paidUsers: paidUsers || 0,
          freeUsers: (totalUsers || 0) - (paidUsers || 0),
          newUsersMonth: newUsersMonth || 0,
          growthData
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'list_users': {
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        // Get subscriptions for all users
        const { data: subscriptions } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('is_active', true);

        const subMap = new Map();
        (subscriptions || []).forEach(s => subMap.set(s.user_id, s));

        const users = (profiles || []).map(p => ({
          ...p,
          subscription: subMap.get(p.id) || null,
          hasActivePlan: subMap.has(p.id)
        }));

        return new Response(JSON.stringify({ users }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'update_user': {
        const { userId, updates } = params;
        const { error } = await supabaseAdmin
          .from('profiles')
          .update(updates)
          .eq('id', userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'list_pets': {
        const { filters } = params || {};
        let query = supabaseAdmin.from('pets').select(`
          *,
          clientes!pets_cliente_id_fkey(nome_cliente, whatsapp)
        `);

        if (filters?.nome) query = query.ilike('nome_pet', `%${filters.nome}%`);
        if (filters?.sexo === 'sem_sexo') {
          query = query.or('sexo.is.null,sexo.eq.');
        } else if (filters?.sexo) {
          query = query.eq('sexo', filters.sexo);
        }
        if (filters?.porte) query = query.eq('porte', filters.porte);
        if (filters?.raca) query = query.ilike('raca', `%${filters.raca}%`);

        const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
        if (error) throw error;

        return new Response(JSON.stringify({ pets: data || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'bulk_update_pets': {
        const { petIds, updates } = params;
        const { error } = await supabaseAdmin
          .from('pets')
          .update(updates)
          .in('id', petIds);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, count: petIds.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'list_subscriptions': {
        const { data } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .order('created_at', { ascending: false });

        return new Response(JSON.stringify({ subscriptions: data || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'grant_extra_days': {
        const { userId, days } = params;
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ 
            dias_liberacao_extra: days,
            liberacao_manual_ativa: true
          })
          .eq('id', userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'export_table': {
        const allowedTables = [
          'profiles', 'subscriptions', 'user_roles', 'staff_accounts', 'staff_permissions',
          'agendamentos', 'agendamentos_pacotes', 'clientes', 'pets', 'servicos', 'produtos',
          'pacotes', 'lancamentos_financeiros', 'lancamentos_financeiros_itens', 'despesas',
          'receitas', 'contas_bancarias', 'fornecedores', 'compras_nf', 'compras_nf_itens',
          'groomers', 'racas', 'racas_padrao', 'empresa_config', 'comissoes_config',
          'notas_fiscais', 'creche_estadias', 'creche_registros_diarios', 'servicos_creche',
          'pacotes_creche', 'formas_pagamento', 'whatsapp_instances',
          'whatsapp_mensagens_agendadas', 'whatsapp_mensagens_risco', 'permissions',
          'crm_leads', 'crm_mensagens', 'crm_usuarios_autorizados',
        ];
        const table = params?.table;
        const userEmails: string[] | undefined = params?.user_emails;
        if (!table || !allowedTables.includes(table)) {
          return new Response(JSON.stringify({ error: 'Tabela não permitida' }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // If user_emails filter is provided, resolve user IDs
        let filterUserIds: string[] | null = null;
        if (userEmails && userEmails.length > 0) {
          const { data: profileRows } = await supabaseAdmin
            .from('profiles')
            .select('id, email_hotmart')
            .in('email_hotmart', userEmails);
          filterUserIds = (profileRows || []).map((p: any) => p.id);
          if (filterUserIds.length === 0) {
            return new Response(JSON.stringify({ rows: [] }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
        }

        // Exclude large binary/base64 columns
        const excludeCols: Record<string, string[]> = {
          notas_fiscais: ['danfe_pdf_base64'],
        };

        // Tables that use user_id for filtering
        const userIdTables = [
          'agendamentos', 'agendamentos_pacotes', 'clientes', 'pets', 'servicos', 'produtos',
          'pacotes', 'lancamentos_financeiros', 'despesas', 'receitas', 'contas_bancarias',
          'fornecedores', 'compras_nf', 'groomers', 'racas', 'empresa_config', 'comissoes_config',
          'notas_fiscais', 'creche_estadias', 'creche_registros_diarios', 'servicos_creche',
          'pacotes_creche', 'formas_pagamento', 'whatsapp_instances',
          'whatsapp_mensagens_agendadas', 'whatsapp_mensagens_risco',
        ];
        // Tables that use id = user_id (profiles)
        const idTables = ['profiles'];

        let query = supabaseAdmin.from(table).select('*').limit(10000);
        if (filterUserIds) {
          if (userIdTables.includes(table)) {
            query = query.in('user_id', filterUserIds);
          } else if (idTables.includes(table)) {
            query = query.in('id', filterUserIds);
          } else if (table === 'user_roles' || table === 'staff_accounts') {
            query = query.in('user_id', filterUserIds);
          } else if (table === 'subscriptions') {
            query = query.in('user_id', filterUserIds);
          } else if (table === 'lancamentos_financeiros_itens') {
            // Get lancamento IDs first, paginated to avoid .in() limit
            let allLancIds: string[] = [];
            let offset = 0;
            const pageSize = 1000;
            while (true) {
              const { data: page, error: pageErr } = await supabaseAdmin
                .from('lancamentos_financeiros')
                .select('id')
                .in('user_id', filterUserIds)
                .range(offset, offset + pageSize - 1);
              if (pageErr) {
                console.error('Error fetching lancamento IDs page:', pageErr);
                throw pageErr;
              }
              if (!page || page.length === 0) break;
              allLancIds = allLancIds.concat(page.map((l: any) => l.id));
              if (page.length < pageSize) break;
              offset += pageSize;
            }
            console.log(`lancamentos_financeiros_itens export: found ${allLancIds.length} parent lancamento IDs for ${filterUserIds.length} users`);
            if (allLancIds.length === 0) {
              return new Response(JSON.stringify({ rows: [] }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
            // Fetch items in batches to avoid .in() limit, with pagination to bypass 1000-row default
            let allItems: any[] = [];
            const BATCH = 200;
            for (let i = 0; i < allLancIds.length; i += BATCH) {
              const batch = allLancIds.slice(i, i + BATCH);
              let batchOffset = 0;
              const batchPageSize = 1000;
              while (true) {
                const { data: batchRows, error: batchErr } = await supabaseAdmin
                  .from('lancamentos_financeiros_itens')
                  .select('*')
                  .in('lancamento_id', batch)
                  .range(batchOffset, batchOffset + batchPageSize - 1);
                if (batchErr) {
                  console.error(`Error fetching items batch ${Math.floor(i / BATCH) + 1} offset ${batchOffset}:`, batchErr);
                  throw batchErr;
                }
                if (batchRows) allItems = allItems.concat(batchRows);
                if (!batchRows || batchRows.length < batchPageSize) break;
                batchOffset += batchPageSize;
              }
              console.log(`lancamentos_financeiros_itens batch ${Math.floor(i / BATCH) + 1}: fetched so far ${allItems.length} rows`);
            }
            console.log(`lancamentos_financeiros_itens export: fetched ${allItems.length} items total`);
            const exclude = excludeCols[table] || [];
            const cleaned = allItems.map((r: any) => {
              const obj = { ...r };
              exclude.forEach(c => delete obj[c]);
              return obj;
            });
            return new Response(JSON.stringify({ rows: cleaned }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          } else if (table === 'compras_nf_itens') {
            const { data: nfIds } = await supabaseAdmin
              .from('compras_nf')
              .select('id')
              .in('user_id', filterUserIds);
            const ids = (nfIds || []).map((n: any) => n.id);
            if (ids.length === 0) {
              return new Response(JSON.stringify({ rows: [] }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
            query = query.in('nf_id', ids);
          } else if (table === 'staff_permissions') {
            const { data: staffIds } = await supabaseAdmin
              .from('staff_accounts')
              .select('id')
              .in('user_id', filterUserIds);
            const ids = (staffIds || []).map((s: any) => s.id);
            if (ids.length === 0) {
              return new Response(JSON.stringify({ rows: [] }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }
            query = query.in('staff_id', ids);
          }
          // For tables like permissions, racas_padrao, crm_* — no user filter applied
        }

        // Paginate generic query to avoid 1000-row limit
        let allRows: any[] = [];
        let genericOffset = 0;
        const genericPageSize = 1000;
        while (true) {
          const { data: page, error: pageErr } = await query.range(genericOffset, genericOffset + genericPageSize - 1);
          if (pageErr) throw pageErr;
          if (page) allRows = allRows.concat(page);
          if (!page || page.length < genericPageSize) break;
          genericOffset += genericPageSize;
        }
        // Remove excluded columns
        const exclude = excludeCols[table] || [];
        const cleaned = allRows.map((r: any) => {
          const obj = { ...r };
          exclude.forEach(c => delete obj[c]);
          return obj;
        });
        return new Response(JSON.stringify({ rows: cleaned }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação desconhecida' }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
