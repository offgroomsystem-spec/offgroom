// Evolution API integration removed from this project.
// This scheduler is now a no-op to prevent duplicate messages.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[whatsapp-scheduler] Evolution API removida deste projeto. Scheduler desativado.");

  return new Response(
    JSON.stringify({ message: "Scheduler desativado - Evolution API removida deste projeto" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
