import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const {data:project}=await supabase.from("projects").select("id,website_url,github_url,status").eq("slug",slug).maybeSingle();
  if(!project||project.status!=="published") return NextResponse.redirect(new URL("/not-found",getSiteUrl()));
  const destination=project.website_url||project.github_url;
  if(!destination) return NextResponse.redirect(new URL("/projects/"+slug,getSiteUrl()));
  await supabase.from("project_clicks").insert({project_id:project.id,viewer_id:user?.id??null});
  return NextResponse.redirect(destination,303);
}
