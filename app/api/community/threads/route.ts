import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "discussion";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limiter=createAdminClient();
  if(!await consumeRateLimit(limiter,"community-thread:"+user.id,{limit:5,windowSeconds:600,failClosed:true})) return rateLimitResponse();

  const { data: profile } = await supabase.from("profiles").select("is_blocked").eq("id", user.id).maybeSingle();
  if (profile?.is_blocked) return NextResponse.json({ error: "Your account cannot participate in the community." }, { status: 403 });

  const body = await request.json().catch(() => null) as { forum_id?: string; title?: string; content?: string } | null;
  const forumId = body?.forum_id?.trim();
  const title = body?.title?.trim();
  const content = body?.content?.trim();
  if (!forumId || !title || !content) return NextResponse.json({ error: "Forum, title and post are required." }, { status: 400 });
  if (title.length < 4 || title.length > 140) return NextResponse.json({ error: "Titles must be between 4 and 140 characters." }, { status: 400 });
  if (content.length > 10000) return NextResponse.json({ error: "Posts cannot exceed 10,000 characters." }, { status: 400 });

  const { data: forum } = await supabase.from("community_forums").select("id").eq("id", forumId).eq("is_active", true).maybeSingle();
  if (!forum) return NextResponse.json({ error: "That forum is not available." }, { status: 400 });

  const { data: thread, error } = await supabase
    .from("community_threads")
    .insert({
      forum_id: forumId,
      user_id: user.id,
      title,
      content,
      slug: slugify(title) + "-" + Date.now().toString(36),
    })
    .select("id")
    .single();

  if (error || !thread) return NextResponse.json({ error: error?.message || "Could not create discussion." }, { status: 500 });
  return NextResponse.json({ id: thread.id }, { status: 201 });
}
