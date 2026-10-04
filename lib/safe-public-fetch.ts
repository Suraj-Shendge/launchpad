import { resolve4, resolve6 } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

type HeaderMap=Record<string,string|string[]|undefined>;
type FetchOptions={maxBytes?:number;userAgent?:string};

function privateIp(ip:string){
  const v=ip.toLowerCase();
  if(v==="::"||v==="::1"||v.startsWith("fc")||v.startsWith("fd")||v.startsWith("ff"))return true;
  const first=Number.parseInt(v.split(":")[0]||"",16);
  if(Number.isFinite(first)&&first>=0xfe80&&first<=0xfebf)return true;
  const mapped=v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const ipv4=mapped?.[1]||v;
  const parts=ipv4.split(".").map(Number);
  if(parts.length!==4||parts.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
  const [a,b,c]=parts;
  return a===0||a===10||a===127||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===0)||(a===192&&b===168)||(a===198&&(b===18||b===19))||(a===198&&b===51&&c===100)||(a===203&&b===0&&c===113);
}

async function resolvePublicAddress(hostname:string){
  const normalized=hostname.replace(/^\[|\]$/g,"").toLowerCase();
  if(normalized==="localhost"||normalized.endsWith(".localhost")||normalized.endsWith(".local"))throw new Error("Private hostname is not allowed.");
  const literal=isIP(normalized);
  if(literal){
    if(privateIp(normalized))throw new Error("Private network target is not allowed.");
    return {address:normalized,family:literal};
  }
  const results=await Promise.allSettled([resolve4(normalized),resolve6(normalized)]);
  const addresses=results.flatMap(r=>r.status==="fulfilled"?r.value:[]);
  if(!addresses.length)throw new Error("Hostname could not be resolved.");
  if(addresses.some(privateIp))throw new Error("Private network target is not allowed.");
  const address=addresses.find(ip=>isIP(ip)===4)||addresses.find(ip=>isIP(ip)===6);
  if(!address)throw new Error("Unsupported network address.");
  return {address,family:isIP(address)};
}

export async function safePublicFetch(input:string,options:FetchOptions={}){
  const maxBytes=options.maxBytes??250000;
  let current=new URL(input);
  if(!["http:","https:"].includes(current.protocol))throw new Error("Only HTTP and HTTPS URLs are allowed.");
  if(current.username||current.password)throw new Error("URL credentials are not allowed.");

  for(let hop=0;hop<=3;hop++){
    const resolved=await resolvePublicAddress(current.hostname);
    const requestImpl=current.protocol==="https:"?httpsRequest:httpRequest;
    const headers={"user-agent":options.userAgent||"ProjectHub/1.0","accept":"*/*"};
    const result=await new Promise<{status:number;headers:HeaderMap;body:Buffer}>((resolve,reject)=>{
      let settled=false;
      const finish=(error?:Error,value?:{status:number;headers:HeaderMap;body:Buffer})=>{
        if(settled)return; settled=true; error?reject(error):resolve(value!);
      };
      const req=requestImpl({
        protocol:current.protocol,
        hostname:current.hostname,
        port:current.port||undefined,
        method:"GET",
        path:current.pathname+current.search,
        headers,
        lookup:(_hostname,_options,callback)=>{
          if((_options as {all?:boolean}).all)(callback as any)(null,[{address:resolved.address,family:resolved.family}]);
          else callback(null,resolved.address,resolved.family);
        },
        ...(current.protocol==="https:"&&isIP(current.hostname.replace(/^\[|\]$/g,""))===0?{servername:current.hostname}:{}),
      },response=>{
        const declared=Number(response.headers["content-length"]||0);
        if(Number.isFinite(declared)&&declared>maxBytes){response.resume();finish(new Error("Response is too large."));return;}
        const chunks:Buffer[]=[]; let size=0;
        response.on("data",(chunk:Buffer|string)=>{
          const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
          size+=b.length;
          if(size>maxBytes){req.destroy();finish(new Error("Response is too large."));return;}
          chunks.push(b);
        });
        response.on("end",()=>finish(undefined,{status:response.statusCode||0,headers:response.headers as HeaderMap,body:Buffer.concat(chunks)}));
        response.on("error",error=>finish(error));
      });
      req.setTimeout(10000,()=>req.destroy(new Error("Request timed out.")));
      req.on("error",error=>finish(error));
      req.end();
    });
    if([301,302,303,307,308].includes(result.status)){
      const location=Array.isArray(result.headers.location)?result.headers.location[0]:result.headers.location;
      if(!location)throw new Error("Redirect without location.");
      current=new URL(location,current);
      if(!["http:","https:"].includes(current.protocol))throw new Error("Only HTTP and HTTPS URLs are allowed.");
      if(current.username||current.password)throw new Error("URL credentials are not allowed.");
      continue;
    }
    return {status:result.status,headers:result.headers,body:result.body,url:current};
  }
  throw new Error("Too many redirects.");
}

export async function safeFetchText(input:string,maxBytes=250000,userAgent="ProjectHub/1.0"){
  const result=await safePublicFetch(input,{maxBytes,userAgent});
  return {...result,text:result.body.toString("utf8")};
}
