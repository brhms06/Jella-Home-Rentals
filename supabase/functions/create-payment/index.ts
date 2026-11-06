import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const UNLOCK_AMOUNT = 500;
const FAPSHI_BASE_URL = "https://sandbox.fapshi.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { listing_id, device_id, phone } = await req.json();
  if (!listing_id || !device_id || !phone) {
    return new Response(JSON.stringify({ message: "listing_id, device_id and phone are required" }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: unlock, error: upsertError } = await supabase
    .from("listing_unlocks")
    .upsert(
      { listing_id, device_id, status: "pending", amount: UNLOCK_AMOUNT, consumed: false },
      { onConflict: "listing_id,device_id" }
    )
    .select()
    .single();
  if (upsertError) {
    return new Response(JSON.stringify({ message: upsertError.message }), { status: 500, headers: corsHeaders });
  }

  const fapshiRes = await fetch(`${FAPSHI_BASE_URL}/direct-pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apiuser: Deno.env.get("FAPSHI_API_USER")!,
      apikey: Deno.env.get("FAPSHI_API_KEY")!,
    },
    body: JSON.stringify({
      amount: UNLOCK_AMOUNT,
      phone,
      medium: "mobile money",
      externalId: unlock.id,
      message: "Unlock listing contact info",
    }),
  });
  const fapshiData = await fapshiRes.json();

  if (!fapshiRes.ok) {
    await supabase.from("listing_unlocks").update({ status: "failed" }).eq("id", unlock.id);
    return new Response(JSON.stringify({ message: fapshiData.message ?? "Payment request failed" }), { status: 502, headers: corsHeaders });
  }

  await supabase.from("listing_unlocks").update({ fapshi_trans_id: fapshiData.transId }).eq("id", unlock.id);

  return new Response(JSON.stringify({ transId: fapshiData.transId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
