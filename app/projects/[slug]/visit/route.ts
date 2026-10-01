import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:project}=await supabase.from("projects").select("id,website_url,status").eq("slug",slug).maybeSingle();
  if(!project||project.status!=="published") return NextResponse.redirect(new URL("/not-found",process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000"));
  await supabase.from("project_clicks").insert({project_id:project.id,viewer_id:user?.id??null});
  return NextResponse.redirect(project.website_url,303);
}
