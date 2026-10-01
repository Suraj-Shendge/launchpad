import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function privateIp(ip:string){
  if(isIP(ip)===6){
    const value=ip.toLowerCase();
    return value==="::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:");
  }
  const [a,b]=ip.split(".").map(Number);
  return a===10 || a===127 || (a===169&&b===254) || (a===172&&b>=16&&b<=31) || (a===192&&b===168) || (a===100&&b>=64&&b<=127);
}

async function safeUrl(raw:string){
  const url=new URL(raw);
  if(!["http:","https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are supported.");
  const host=url.hostname.replace(/^\[|\]$/g,"").toLowerCase();
  if(host==="localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw new Error("That URL is not reachable.");
  if(isIP(host) && privateIp(host)) throw new Error("Private network URLs are not allowed.");
  if(!isIP(host)){
    const addresses=await lookup(host,{all:true});
    if(!addresses.length || addresses.some(item=>privateIp(item.address))) throw new Error("That URL is not publicly reachable.");
  }
  url.username="";url.password="";
  return url;
}

function pick(html:string,patterns:RegExp[]){
  for(const pattern of patterns){const match=html.match(pattern);if(match?.[1])return match[1].replace(/&amp;/g,"&").trim();}
  return "";
}

function absolute(value:string,base:URL){
  try{return new URL(value,base).toString();}catch{return "";}
}
export async function GET(request:Request){
  try{
    const raw=new URL(request.url).searchParams.get("url")||"";
    if(!raw) return NextResponse.json({error:"Project URL is required."},{status:400});
    let target=await safeUrl(raw);
    let response:Response|null=null;
    for(let attempt=0;attempt<3;attempt++){
      response=await fetch(target,{headers:{"user-agent":"ProjectHub Metadata Bot/1.0"},"redirect":"manual","cache":"no-store"});
      if(response.status<300||response.status>=400) break;
      const location=response.headers.get("location");
      if(!location) break;
      target=await safeUrl(new URL(location,target).toString());
    }
    if(!response?.ok) return NextResponse.json({error:"The website could not be read."},{status:422});
    const type=response.headers.get("content-type")||"";
    if(!type.includes("text/html")) return NextResponse.json({error:"That URL does not point to a web page."},{status:422});
    const html=(await response.text()).slice(0,150000);
    const title=pick(html,[/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,/<title[^>]*>([\s\S]*?)<\/title>/i]);
    const description=pick(html,[/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i]);
    const image=pick(html,[/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i]);
    const icon=pick(html,[/<link[^>]+rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]+href=["']([^"']+)["']/i]);
    const logo=absolute(icon||image,target);
    return NextResponse.json({title:title.replace(/<[^>]+>/g,"").trim(),description:description.replace(/<[^>]+>/g,"").trim(),logo,source:target.toString()},{headers:{"cache-control":"public, max-age=900"}});
  }catch(error){
    const message=error instanceof Error?error.message:"Metadata fetch failed.";
    return NextResponse.json({error:message},{status:422});
  }
}
