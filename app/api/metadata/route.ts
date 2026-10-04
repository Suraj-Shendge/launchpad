import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { safeFetchText } from "@/lib/safe-public-fetch";

function pick(html:string,patterns:RegExp[]){
  for(const pattern of patterns){
    const match=html.match(pattern);
    if(match?.[1])return match[1].replace(/&amp;/g,"&").trim();
  }
  return "";
}
function absolute(value:string,base:URL){
  try{return new URL(value,base).toString();}catch{return "";}
}

export async function GET(request:Request){
  try{
    const limiter=createAdminClient();
    if(!await consumeRateLimit(limiter,"metadata:"+getClientIp(request),{limit:30,windowSeconds:60,failClosed:true}))return rateLimitResponse();
    const raw=new URL(request.url).searchParams.get("url")||"";
    if(!raw)return NextResponse.json({error:"Project URL is required."},{status:400});
    const result=await safeFetchText(raw,500000,"ProjectHub Metadata Bot/1.0");
    if(result.status<200||result.status>=300)return NextResponse.json({error:"The website could not be read."},{status:422});
    const type=String(result.headers["content-type"]||"");
    if(!type.includes("text/html"))return NextResponse.json({error:"That URL does not point to a web page."},{status:422});
    const html=result.text.slice(0,150000);
    const title=pick(html,[
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
      /<title[^>]*>([\s\S]*?)<\/title>/i
    ]);
    const description=pick(html,[
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    ]);
    const image=pick(html,[
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
    ]);
    const icon=pick(html,[
      /<link[^>]+rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]+href=["']([^"']+)["']/i
    ]);
    const logo=absolute(icon||image,result.url);
    return NextResponse.json({
      title:title.replace(/<[^>]+>/g,"").trim(),
      description:description.replace(/<[^>]+>/g,"").trim(),
      logo,
      source:result.url.toString()
    },{headers:{"cache-control":"public, max-age=900"}});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Metadata fetch failed."},{status:422});
  }
}
