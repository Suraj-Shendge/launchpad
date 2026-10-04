import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limiter=createAdminClient();
  if(!await consumeRateLimit(limiter,"community-thread-vote:"+auth.user.id,{limit:120,windowSeconds:600})) return rateLimitResponse();

  const { data: profile } = await supabase.from("profiles").select("is_blocked").eq("id", auth.user.id).maybeSingle();
  if (profile?.is_blocked) return NextResponse.json({ error: "Your account cannot participate in the community." }, { status: 403 });

  const { data, error } = await supabase.rpc("toggle_community_thread_vote", { p_thread_id: id });
  if (error) {
    if (error.message.includes("THREAD_NOT_FOUND")) return NextResponse.json({ error: "Discussion not found." }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = data as { voted: boolean; vote_count: number };
  return NextResponse.json(result);
}
