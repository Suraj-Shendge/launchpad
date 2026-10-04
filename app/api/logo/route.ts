import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { safePublicFetch } from "@/lib/safe-public-fetch";

export async function GET(request:Request){
  try{
    const limiter=createAdminClient();
    if(!await consumeRateLimit(limiter,"logo:"+getClientIp(request),{limit:30,windowSeconds:60,failClosed:true}))return rateLimitResponse();
    const raw=new URL(request.url).searchParams.get("url")||"";
    if(!raw)return new NextResponse("Missing url",{status:400});
    const result=await safePublicFetch(raw,{maxBytes:4_000_000,userAgent:"ProjectHub Image Proxy/1.0"});
    if(result.status<200||result.status>=300)return new NextResponse("Image unavailable",{status:404});
    const type=String(result.headers["content-type"]||"");
    if(!type.toLowerCase().startsWith("image/"))return new NextResponse("Not an image",{status:415});
    return new Response(result.body as unknown as BodyInit,{status:200,headers:{
      "content-type":type,
      "cache-control":"public, max-age=86400, stale-while-revalidate=604800",
    }});
  }catch{return new NextResponse("Image unavailable",{status:404});}
}
