import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.headers.get("x-wh-secret") !== Deno.env.get("FAPSHI_WEBHOOK_SECRET")) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  const { transId, status } = await req.json();
  if (!transId || !status) {
    return new Response(JSON.stringify({ message: "transId and status are required" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fapshi statuses (CREATED/PENDING/SUCCESSFUL/FAILED/EXPIRED) map onto the
  // lowercase set the listing_unlocks check constraint allows; CREATED has
  // no separate row state so it folds into "pending".
  const mapped = status === "CREATED" ? "pending" : (status.toLowerCase() as string);

  await supabase.from("listing_unlocks").update({ status: mapped }).eq("fapshi_trans_id", transId);

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
