import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ponytail: one fixed package. Add a `days` choice later if landlords ask for more.
const BOOST_AMOUNT = 1000;
const BOOST_DAYS = 7;
const FAPSHI_BASE_URL = "https://sandbox.fapshi.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { listing_id, phone } = await req.json();
  if (!listing_id || !phone) return json({ message: "listing_id and phone are required" }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Who is calling? (verify_jwt already rejected anonymous callers; this resolves the user id.)
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json({ message: "Unauthorized" }, 401);
  const userId = userData.user.id;

  // The caller must own the listing, and it must be live (boosting a hidden listing wastes money).
  const { data: listing } = await supabase
    .from("listings")
    .select("id, owner_id, status, verification_status")
    .eq("id", listing_id)
    .single();
  if (!listing || listing.owner_id !== userId) return json({ message: "Listing not found" }, 404);
  if (listing.status !== "active" || listing.verification_status !== "verified") {
    return json({ message: "Only active, verified listings can be boosted" }, 400);
  }

  const { data: boost, error: insertError } = await supabase
    .from("listing_boosts")
    .insert({ listing_id, owner_id: userId, days: BOOST_DAYS, amount: BOOST_AMOUNT })
    .select()
    .single();
  if (insertError) return json({ message: insertError.message }, 500);

  const fapshiRes = await fetch(`${FAPSHI_BASE_URL}/direct-pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apiuser: Deno.env.get("FAPSHI_API_USER")!,
      apikey: Deno.env.get("FAPSHI_API_KEY")!,
    },
    body: JSON.stringify({
      amount: BOOST_AMOUNT,
      phone,
      medium: "mobile money",
      externalId: boost.id,
      message: `Boost listing for ${BOOST_DAYS} days`,
    }),
  });
  const fapshiData = await fapshiRes.json();

  if (!fapshiRes.ok) {
    await supabase.from("listing_boosts").update({ status: "failed" }).eq("id", boost.id);
    return json({ message: fapshiData.message ?? "Payment request failed" }, 502);
  }

  await supabase.from("listing_boosts").update({ fapshi_trans_id: fapshiData.transId }).eq("id", boost.id);
  return json({ transId: fapshiData.transId, amount: BOOST_AMOUNT, days: BOOST_DAYS });
});
