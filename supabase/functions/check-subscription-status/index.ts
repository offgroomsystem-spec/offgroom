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

// Stripe product configurations
const STRIPE_PRODUCTS = {
  'prod_TVzSAVPqB5ye8V': { name: 'Offgroom Flex', days: 31 },
  'prod_TUsA6Cvxwh3CAM': { name: 'Offgroom Power 24', days: 730 }
};

const TRIAL_DAYS = 10;

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

    // Get user profile to check trial (use owner's profile for staff)
    const profileId = staffAccount?.owner_id || user.id;
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('created_at')
      .eq('id', profileId)
      .single();

    if (profileError) {
      logStep("Error fetching profile", { error: profileError });
    }

    const createdAt = profile?.created_at ? new Date(profile.created_at) : new Date();
    const daysSinceRegistration = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const trialDaysRemaining = Math.max(0, TRIAL_DAYS - daysSinceRegistration);

    logStep("Trial calculation", { daysSinceRegistration, trialDaysRemaining });

    // 2️⃣ CHECK ACTIVE STRIPE SUBSCRIPTION
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("WARNING: STRIPE_SECRET_KEY not configured");
    } else {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      // Find Stripe customer by email (owner's email for staff)
      const customers = await stripe.customers.list({ email: emailToCheck, limit: 1 });
      
      if (customers.data.length > 0) {
        const customerId = customers.data[0].id;
        logStep("Stripe customer found", { customerId, email: emailToCheck });

        // Check for active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 10,
        });

        logStep("Subscriptions found", { count: subscriptions.data.length });

        for (const subscription of subscriptions.data) {
          const subscriptionItem = subscription.items.data[0];
          if (!subscriptionItem) {
            logStep("No subscription item found", { subscriptionId: subscription.id });
            continue;
          }

          const productId = subscriptionItem.price.product as string;
          const productConfig = STRIPE_PRODUCTS[productId as keyof typeof STRIPE_PRODUCTS];

          logStep("Processing subscription", { 
            subscriptionId: subscription.id,
            productId,
            hasProductConfig: !!productConfig
          });

          if (productConfig) {
            // Get period dates - try multiple sources
            // Stripe API returns these at subscription level, not item level
            const periodStart = subscription.current_period_start;
            const periodEnd = subscription.current_period_end;
            
            logStep("Period data", { 
              periodStart, 
              periodEnd,
              subscriptionCreated: subscription.created,
              subscriptionStartDate: subscription.start_date
            });

            if (!periodEnd) {
              logStep("Warning: No period end found, using fallback calculation");
              // Fallback: use subscription start date + product days
              const startTimestamp = subscription.start_date || subscription.created;
              const subscriptionStart = new Date(startTimestamp * 1000);
              const subscriptionEnd = new Date(subscriptionStart.getTime() + (productConfig.days * 24 * 60 * 60 * 1000));
              const daysRemaining = Math.floor((subscriptionEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

              logStep("Fallback calculation used", {
                subscriptionStart: subscriptionStart.toISOString(),
                subscriptionEnd: subscriptionEnd.toISOString(),
                daysRemaining
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
                  status: 'active',
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
            }

            // Use actual period dates from Stripe
            const subscriptionStart = new Date(periodStart * 1000);
            const subscriptionEnd = new Date(periodEnd * 1000);
            const daysRemaining = Math.floor((subscriptionEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            logStep("Active Stripe subscription found", {
              subscriptionId: subscription.id,
              productId,
              productName: productConfig.name,
              daysRemaining,
              subscriptionStart: subscriptionStart.toISOString(),
              subscriptionEnd: subscriptionEnd.toISOString()
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
                status: 'active',
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
          }
        }

        logStep("No matching active Stripe subscriptions found");
      } else {
        logStep("No Stripe customer found for email", { email: emailToCheck });
      }
    }

    // 3️⃣ CHECK TRIAL PERIOD
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

    // 4️⃣ NO ACCESS - EXPIRED
    logStep("Access denied - trial expired, no active subscription");
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
