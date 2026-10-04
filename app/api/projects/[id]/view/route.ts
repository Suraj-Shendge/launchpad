import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { hasEnvVars } from "@/lib/utils";
import { serviceUnavailable } from "@/lib/api-response";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!hasEnvVars) return serviceUnavailable();
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const admin=createAdminClient();
  if(!await consumeRateLimit(admin,"project-view:"+getClientIp(request),{limit:60,windowSeconds:60}))return rateLimitResponse();
  const {data:project}=await supabase.from("projects").select("id,status").eq("id",id).maybeSingle();
  if(!project||project.status!=="published") return NextResponse.json({ok:false},{status:404});
  const {error}=await supabase.from("project_views").insert({project_id:id,viewer_id:user?.id??null});
  return NextResponse.json({ok:!error});
}
