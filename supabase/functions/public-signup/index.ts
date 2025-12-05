import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, nome_completo, whatsapp } = await req.json();

    console.log('[PUBLIC-SIGNUP] Starting signup for:', email);

    // Validate required fields
    if (!email || !password || !nome_completo || !whatsapp) {
      console.log('[PUBLIC-SIGNUP] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Todos os campos são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password length
    if (password.length < 8) {
      console.log('[PUBLIC-SIGNUP] Password too short');
      return new Response(
        JSON.stringify({ error: 'Senha deve ter no mínimo 8 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email_hotmart', email)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      console.log('[PUBLIC-SIGNUP] User already exists:', email);
      return new Response(
        JSON.stringify({ error: 'Este e-mail já está cadastrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for trial users
      user_metadata: {
        nome_completo,
        email_hotmart: email,
        whatsapp
      }
    });

    if (authError) {
      console.log('[PUBLIC-SIGNUP] Auth error:', authError.message);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData.user) {
      console.log('[PUBLIC-SIGNUP] No user returned from createUser');
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log('[PUBLIC-SIGNUP] User created with ID:', userId);

    // The trigger handle_new_user will create the profile automatically
    // Now we need to assign the 'administrador' role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'administrador'
      });

    if (roleError) {
      console.log('[PUBLIC-SIGNUP] Role assignment error:', roleError.message);
      // Don't fail the signup, the user was created successfully
    } else {
      console.log('[PUBLIC-SIGNUP] Administrador role assigned to user:', userId);
    }

    console.log('[PUBLIC-SIGNUP] Signup completed successfully for:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cadastro realizado com sucesso!',
        user_id: userId 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PUBLIC-SIGNUP] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
