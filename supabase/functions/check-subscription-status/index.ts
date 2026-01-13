import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VIP users with vitalício (lifetime) access
const VIP_EMAILS = [
  'rodrygo.sv12@gmail.com',
  'offgroom.system@gmail.com'
];

// Stripe product configurations (Production) - IDs atualizados em 13/01/2026
const STRIPE_PRODUCTS: Record<string, { name: string; days: number; recurring?: boolean }> = {
  'prod_TkEgedLF4KEFOY': { name: 'Offgroom Power 12', days: 365, recurring: false },
  'prod_TkEhVLxoKBaa7Q': { name: 'Offgroom Flex', days: 31, recurring: true }
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUBSCRIPTION-STATUS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is a staff member and get owner's email for subscription check
    let emailToCheck = user.email;
    const { data: staffAccount } = await supabaseClient
      .from('staff_accounts')
      .select('owner_id')
      .eq('user_id', user.id)
      .single();

    if (staffAccount?.owner_id) {
      // User is a staff member, get owner's email
      const { data: ownerProfile } = await supabaseClient
        .from('profiles')
        .select('email_hotmart')
        .eq('id', staffAccount.owner_id)
        .single();
      
      if (ownerProfile?.email_hotmart) {
        emailToCheck = ownerProfile.email_hotmart;
        logStep("Staff member detected, checking owner subscription", { 
          staffUserId: user.id, 
          ownerId: staffAccount.owner_id,
          ownerEmail: emailToCheck 
        });
      }
    }

    // 1️⃣ CHECK VIP WHITELIST (vitalício access)
    if (VIP_EMAILS.includes(emailToCheck.toLowerCase())) {
      logStep("VIP user detected - vitalício access granted", { email: emailToCheck });
      return new Response(JSON.stringify({
        hasAccess: true,
        type: 'vip',
        message: 'Acesso vitalício concedido'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get user profile to check trial and manual release (use owner's profile for staff)
    const profileId = staffAccount?.owner_id || user.id;
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select(`
        created_at, 
        trial_end_date,
        periodo_gratis_dias,
        data_inicio_periodo_gratis,
        data_fim_periodo_gratis,
        dias_liberacao_extra,
        data_fim_liberacao_extra,
        liberacao_manual_ativa
      `)
      .eq('id', profileId)
      .single();

    if (profileError) {
      logStep("Error fetching profile", { error: profileError });
    }

    logStep("Profile data loaded", {
      periodoGratisDias: profile?.periodo_gratis_dias,
      dataFimPeriodoGratis: profile?.data_fim_periodo_gratis,
      diasLiberacaoExtra: profile?.dias_liberacao_extra,
      dataFimLiberacaoExtra: profile?.data_fim_liberacao_extra,
      liberacaoManualAtiva: profile?.liberacao_manual_ativa
    });

    // 2️⃣ CHECK LIBERAÇÃO MANUAL ATIVA (temporary access for overdue payments)
    if (profile?.liberacao_manual_ativa && profile?.data_fim_liberacao_extra) {
      const liberacaoEnd = new Date(profile.data_fim_liberacao_extra);
      const now = new Date();
      
      if (liberacaoEnd > now) {
        const diasRestantes = Math.ceil((liberacaoEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        logStep("Manual release active - access granted", { 
          dataFimLiberacaoExtra: liberacaoEnd.toISOString(),
          diasRestantes 
        });
        
        return new Response(JSON.stringify({
          hasAccess: true,
          type: 'liberacao_manual',
          daysRemaining: diasRestantes,
          message: `Acesso liberado manualmente: ${diasRestantes} dias restantes`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } else {
        logStep("Manual release expired", { dataFimLiberacaoExtra: liberacaoEnd.toISOString() });
      }
    }

    // 3️⃣ CHECK ACTIVE STRIPE SUBSCRIPTION (with isolated error handling)
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    let stripeCheckFailed = false;
    
    if (!stripeKey) {
      logStep("WARNING: STRIPE_SECRET_KEY not configured");
      stripeCheckFailed = true;
    } else {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

        // Find Stripe customer by email (owner's email for staff)
        const customers = await stripe.customers.list({ email: emailToCheck, limit: 1 });
        
        if (customers.data.length > 0) {
          const customerId = customers.data[0].id;
          logStep("Stripe customer found", { customerId, email: emailToCheck });

          // Check for active subscriptions first
          const activeSubscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 10,
          });

          logStep("Active subscriptions found", { count: activeSubscriptions.data.length });

          // Also check for canceled subscriptions that still have valid paid period
          const canceledSubscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'canceled',
            limit: 10,
          });

          logStep("Canceled subscriptions found", { count: canceledSubscriptions.data.length });

          // Combine both lists for processing
          const allSubscriptions = [...activeSubscriptions.data, ...canceledSubscriptions.data];

          for (const subscription of allSubscriptions) {
            const subscriptionItem = subscription.items.data[0];
            if (!subscriptionItem) {
              logStep("No subscription item found", { subscriptionId: subscription.id });
              continue;
            }

            const productId = subscriptionItem.price.product as string;
            const productConfig = STRIPE_PRODUCTS[productId];

            logStep("Processing subscription", { 
              subscriptionId: subscription.id,
              productId,
              status: subscription.status,
              hasProductConfig: !!productConfig
            });

            if (productConfig) {
              // Get period dates from Stripe subscription
              const periodStart = subscription.current_period_start;
              const periodEnd = subscription.current_period_end;
              
              logStep("Period data", { 
                periodStart, 
                periodEnd,
                subscriptionStatus: subscription.status,
                subscriptionCreated: subscription.created,
                subscriptionStartDate: subscription.start_date
              });

              // Calculate subscription end based on period or product days
              let subscriptionStart: Date;
              let subscriptionEnd: Date;

              if (periodEnd) {
                // Use actual period dates from Stripe
                subscriptionStart = new Date(periodStart * 1000);
                subscriptionEnd = new Date(periodEnd * 1000);
              } else {
                // Fallback: use subscription start date + product days
                const startTimestamp = subscription.start_date || subscription.created;
                subscriptionStart = new Date(startTimestamp * 1000);
                subscriptionEnd = new Date(subscriptionStart.getTime() + (productConfig.days * 24 * 60 * 60 * 1000));
              }

              const now = Date.now();
              const daysRemaining = Math.floor((subscriptionEnd.getTime() - now) / (1000 * 60 * 60 * 24));

              logStep("Subscription period calculated", {
                subscriptionId: subscription.id,
                productName: productConfig.name,
                subscriptionStart: subscriptionStart.toISOString(),
                subscriptionEnd: subscriptionEnd.toISOString(),
                daysRemaining,
                isWithinPaidPeriod: subscriptionEnd.getTime() > now
              });

              // Check if subscription is still within paid period
              if (subscriptionEnd.getTime() > now) {
                logStep("Active subscription access granted", {
                  subscriptionId: subscription.id,
                  productId,
                  productName: productConfig.name,
                  daysRemaining,
                  status: subscription.status
                });

                // Update subscriptions table
                await supabaseClient
                  .from('subscriptions')
                  .upsert({
                    user_id: profileId,
                    stripe_customer_id: customerId,
                    stripe_subscription_id: subscription.id,
                    stripe_product_id: productId,
                    plan_name: productConfig.name,
                    subscription_start: subscriptionStart.toISOString(),
                    subscription_end: subscriptionEnd.toISOString(),
                    is_active: true,
                    status: subscription.status === 'active' ? 'active' : 'canceled_with_access',
                    updated_at: new Date().toISOString()
                  }, {
                    onConflict: 'stripe_subscription_id'
                  });

                return new Response(JSON.stringify({
                  hasAccess: true,
                  type: 'subscription',
                  productId,
                  productName: productConfig.name,
                  daysRemaining: Math.max(0, daysRemaining),
                  subscriptionEnd: subscriptionEnd.toISOString(),
                  message: `Plano ${productConfig.name} ativo`
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200,
                });
              } else {
                logStep("Subscription period expired", {
                  subscriptionId: subscription.id,
                  subscriptionEnd: subscriptionEnd.toISOString()
                });
              }
            }
          }

          logStep("No matching active Stripe subscriptions found with valid period");
        } else {
          logStep("No Stripe customer found for email", { email: emailToCheck });
        }
      } catch (stripeError) {
        // Stripe API error - don't block user, continue to trial check
        const errorMsg = stripeError instanceof Error ? stripeError.message : String(stripeError);
        logStep("Stripe API error - continuing to trial check", { error: errorMsg });
        stripeCheckFailed = true;
      }
    }

    // 4️⃣ CHECK TRIAL PERIOD (using new data_fim_periodo_gratis column)
    let trialDaysRemaining = 0;
    
    if (profile?.data_fim_periodo_gratis) {
      // Use the new calculated field
      const trialEnd = new Date(profile.data_fim_periodo_gratis);
      trialDaysRemaining = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      logStep("Trial calculated from data_fim_periodo_gratis", { 
        dataFimPeriodoGratis: trialEnd.toISOString(), 
        trialDaysRemaining 
      });
    } else if (profile?.trial_end_date) {
      // Fallback to legacy field
      const trialEnd = new Date(profile.trial_end_date);
      trialDaysRemaining = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      logStep("Trial calculated from legacy trial_end_date", { 
        trialEndDate: trialEnd.toISOString(), 
        trialDaysRemaining 
      });
    } else if (profile?.created_at) {
      // Final fallback: calculate from created_at + 30 days
      const createdAt = new Date(profile.created_at);
      const trialEnd = new Date(createdAt.getTime() + (30 * 24 * 60 * 60 * 1000));
      trialDaysRemaining = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      logStep("Trial calculated from created_at + 30 days", { 
        createdAt: createdAt.toISOString(),
        trialEnd: trialEnd.toISOString(), 
        trialDaysRemaining 
      });
    }

    if (trialDaysRemaining > 0) {
      logStep("Trial period active", { daysRemaining: trialDaysRemaining });
      return new Response(JSON.stringify({
        hasAccess: true,
        type: 'trial',
        daysRemaining: trialDaysRemaining,
        message: `Período de teste: ${trialDaysRemaining} dias restantes`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 5️⃣ NO ACCESS - EXPIRED
    logStep("Access denied - trial expired, no active subscription, no manual release");
    return new Response(JSON.stringify({
      hasAccess: false,
      type: 'expired',
      message: 'Período de teste expirado. Assine um plano para continuar.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      hasAccess: false,
      type: 'error',
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
