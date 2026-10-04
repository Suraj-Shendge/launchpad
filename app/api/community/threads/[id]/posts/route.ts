import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limiter=createAdminClient();
  if(!await consumeRateLimit(limiter,"community-reply:"+auth.user.id,{limit:20,windowSeconds:600})) return rateLimitResponse();

  const { data: profile } = await supabase.from("profiles").select("is_blocked").eq("id", auth.user.id).maybeSingle();
  if (profile?.is_blocked) return NextResponse.json({ error: "Your account cannot participate in the community." }, { status: 403 });

  const body = await request.json().catch(() => null) as { content?: string; parent_id?: string | null } | null;
  const content = body?.content?.trim();
  if (!content) return NextResponse.json({ error: "Reply cannot be empty." }, { status: 400 });
  if (content.length > 10000) return NextResponse.json({ error: "Replies cannot exceed 10,000 characters." }, { status: 400 });

  const { data: postId, error } = await supabase.rpc("add_community_post", {
    p_thread_id: id,
    p_content: content,
    p_parent_id: body?.parent_id || null,
  });

  if (error) {
    if (error.message.includes("THREAD_NOT_FOUND")) return NextResponse.json({ error: "Discussion not found." }, { status: 404 });
    if (error.message.includes("THREAD_LOCKED")) return NextResponse.json({ error: "This discussion is locked." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: postId }, { status: 201 });
}
