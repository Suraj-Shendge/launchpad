import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseServerEnv } from "@/lib/utils";
import { serviceUnavailable } from "@/lib/api-response";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const COOKIE="ph_visitor_id";

async function countVisitors(admin:ReturnType<typeof createAdminClient>){
  const {count}=await admin.from("site_visitors").select("visitor_id",{count:"exact",head:true});
  return count??0;
}

export async function POST(request:Request){
  if(!hasSupabaseServerEnv) return serviceUnavailable("Visitor analytics are not configured yet.");
  const jar=await cookies();
  const admin=createAdminClient();
  if(!await consumeRateLimit(admin,"traffic:"+getClientIp(request),{limit:20,windowSeconds:60})) return rateLimitResponse();
  let visitorId=jar.get(COOKIE)?.value;
  const isNew=!visitorId;
  if(!visitorId) visitorId=crypto.randomUUID();
  const now=new Date().toISOString();
  const {error}=await admin.from("site_visitors").upsert({visitor_id:visitorId,last_seen_at:now,visit_count:isNew?1:undefined},{onConflict:"visitor_id"});
  if(error) return NextResponse.json({error:"Could not record visitor."},{status:500});
  const response=NextResponse.json({count:await countVisitors(admin),isNew});
  if(isNew) response.cookies.set(COOKIE,visitorId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:31536000,path:"/"});
  return response;
}

export async function GET(){
  if(!hasSupabaseServerEnv) return serviceUnavailable("Visitor analytics are not configured yet.");
  const admin=createAdminClient();
  return NextResponse.json({count:await countVisitors(admin)},{headers:{"cache-control":"no-store"}});
}
