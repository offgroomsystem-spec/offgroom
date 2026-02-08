import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation helpers
function isValidEmail(email: string): boolean {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function isValidWhatsApp(whatsapp: string): boolean {
  return typeof whatsapp === 'string' && /^\(\d{2}\) \d{5}-\d{4}$/.test(whatsapp);
}

function isValidName(name: string): boolean {
  return typeof name === 'string' && name.trim().length >= 3 && name.length <= 100;
}

// In-memory rate limiting (per isolate instance)
const signupAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // max signups per window
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = signupAttempts.get(ip);
  
  if (!entry || now > entry.resetAt) {
    signupAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  
  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return true;
  }
  return false;
}

// Cleanup old entries periodically
function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, value] of signupAttempts) {
    if (now > value.resetAt) {
      signupAttempts.delete(key);
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting by IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    if (isRateLimited(clientIp)) {
      console.log('[PUBLIC-SIGNUP] Rate limited IP:', clientIp);
      return new Response(
        JSON.stringify({ error: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Periodic cleanup
    cleanupRateLimits();

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

    // Validate email format
    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Formato de e-mail inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password length
    if (typeof password !== 'string' || password.length < 8 || password.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Senha deve ter entre 8 e 100 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate name
    if (!isValidName(nome_completo)) {
      return new Response(
        JSON.stringify({ error: 'Nome deve ter entre 3 e 100 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate WhatsApp
    if (!isValidWhatsApp(whatsapp)) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp inválido. Use o formato (XX) XXXXX-XXXX' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedName = nome_completo.trim();

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
      .eq('email_hotmart', sanitizedEmail)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      console.log('[PUBLIC-SIGNUP] User already exists:', sanitizedEmail);
      return new Response(
        JSON.stringify({ error: 'Este e-mail já está cadastrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: sanitizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        nome_completo: sanitizedName,
        email_hotmart: sanitizedEmail,
        whatsapp
      }
    });

    if (authError) {
      console.log('[PUBLIC-SIGNUP] Auth error:', authError.message);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar conta. Tente novamente.' }),
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

    console.log('[PUBLIC-SIGNUP] Signup completed successfully for:', sanitizedEmail);

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