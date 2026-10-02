import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";

function privateIp(ip:string){
  if(isIP(ip)===6){
    const value=ip.toLowerCase();
    if(value.startsWith("::ffff:")){
      const mapped=value.slice(7);
      if(isIP(mapped)===4)return privateIp(mapped);
    }
    return value==="::1"||value.startsWith("fc")||value.startsWith("fd")||value.startsWith("fe80:");
  }
  const [a,b]=ip.split(".").map(Number);
  return a===10||a===127||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127);
}

async function safePublicUrl(raw:string){
  const url=new URL(raw);
  if(!["http:","https:"].includes(url.protocol))throw new Error("Only HTTP and HTTPS are supported.");
  const host=url.hostname.replace(/^\[|\]$/g,"").toLowerCase();
  if(host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local"))throw new Error("Local URLs are not allowed.");
  if(isIP(host)&&privateIp(host))throw new Error("Private network URLs are not allowed.");
  if(!isIP(host)){
    const addresses=await lookup(host,{all:true});
    if(!addresses.length||addresses.some(item=>privateIp(item.address)))throw new Error("Private network URLs are not allowed.");
  }
  url.username="";url.password="";
  return url;
}
export async function GET(request:Request){
  try{
    const raw=new URL(request.url).searchParams.get("url")||"";
    if(!raw)return new NextResponse("Missing url",{status:400});
    let target=await safePublicUrl(raw);
    let response:Response|null=null;

    for(let attempt=0;attempt<3;attempt++){
      response=await fetch(target,{redirect:"manual",cache:"no-store",headers:{"user-agent":"ProjectHub Image Proxy/1.0"},signal:AbortSignal.timeout(10000)});
      if(response.status<300||response.status>=400)break;
      const location=response.headers.get("location");
      if(!location)break;
      target=await safePublicUrl(new URL(location,target).toString());
    }

    if(!response?.ok)return new NextResponse("Image unavailable",{status:404});
    const type=response.headers.get("content-type")||"";
    if(!type.toLowerCase().startsWith("image/"))return new NextResponse("Not an image",{status:415});
    const length=Number(response.headers.get("content-length")||0);
    if(length>4_000_000)return new NextResponse("Image too large",{status:413});

    const body=await response.arrayBuffer();
    if(body.byteLength>4_000_000)return new NextResponse("Image too large",{status:413});

    return new NextResponse(body,{
      status:200,
      headers:{
        "content-type":type,
        "cache-control":"public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }catch{
    return new NextResponse("Image unavailable",{status:404});
  }
}
