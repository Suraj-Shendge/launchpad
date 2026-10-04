import { resolve4, resolve6, resolveTxt } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

export type VerificationResult = {
  status:string;
  method?:string;
  evidence:Record<string,unknown>;
  failure_reason?:string;
};

const GITHUB_API="https://api.github.com";
const MAX_REDIRECTS=3;

function isPrivateIp(ip:string){
  const v=ip.toLowerCase();
  if(v==="localhost"||v==="::"||v==="::1"||v.startsWith("fc")||v.startsWith("fd")||v.startsWith("ff")) return true;
  const firstHextet=Number.parseInt(v.split(":")[0]||"",16);
  if(Number.isFinite(firstHextet)&&firstHextet>=0xfe80&&firstHextet<=0xfebf) return true;
  const mapped=v.match(/^::ffff:(\\d+\\.\\d+\\.\\d+\\.\\d+)$/);
  const ipv4=mapped?.[1]||v;
  const parts=ipv4.split(".").map(Number);
  if(parts.length!==4||parts.some(Number.isNaN)||parts.some(part=>part<0||part>255)) return false;
  const [x,y]=parts;
  return x===0||x===10||x===127||(x===100&&y>=64&&y<=127)||(x===169&&y===254)||(x===172&&y>=16&&y<=31)||(x===192&&y===0)||(x===192&&y===168)||(x===198&&(y===18||y===19))||(x===198&&y===51)||(x===203&&y===0);
}

async function resolvePublicAddress(hostname:string){
  const normalized=hostname.replace(/^\[|\]$/g,"").toLowerCase();
  if(normalized==="localhost"||normalized.endsWith(".localhost")||normalized.endsWith(".local")) throw new Error("Private hostname is not allowed.");
  const literalType=isIP(normalized);
  if(literalType){
    if(isPrivateIp(normalized)) throw new Error("Private network target is not allowed.");
    return {address:normalized,family:literalType};
  }
  const results=await Promise.allSettled([resolve4(normalized),resolve6(normalized)]);
  const addresses=results.flatMap(result=>result.status==="fulfilled"?result.value:[]);
  if(!addresses.length) throw new Error("The website hostname could not be resolved.");
  if(addresses.some(isPrivateIp)) throw new Error("Private network target is not allowed.");
  const address=addresses.find(ip=>isIP(ip)===4)||addresses.find(ip=>isIP(ip)===6);
  if(!address) throw new Error("The website hostname resolved to an unsupported address.");
  return {address,family:isIP(address)};
}

export async function safeFetchText(input:string,maxBytes=250_000){
  let current=new URL(input);
  if(!["http:","https:"].includes(current.protocol)) throw new Error("Only HTTP and HTTPS URLs are allowed.");
  if(current.username||current.password) throw new Error("Website credentials in URLs are not allowed.");

  for(let hop=0;hop<=MAX_REDIRECTS;hop++){
    const resolved=await resolvePublicAddress(current.hostname);
    const requestHeaders={
      "user-agent":"ProjectHub-Verifier/1.0",
      "accept":"text/html,text/plain;q=0.9,*/*;q=0.5"
    };
    const requestImpl=current.protocol==="https:"?httpsRequest:httpRequest;
    const result=await new Promise<{status:number;headers:Record<string,string|string[]|undefined>;body:string}>((resolve,reject)=>{
      let settled=false;
      const finish=(error?:Error,value?:{status:number;headers:Record<string,string|string[]|undefined>;body:string})=>{
        if(settled)return;
        settled=true;
        error?reject(error):resolve(value!);
      };
      const req=requestImpl({
        protocol:current.protocol,
        hostname:current.hostname,
        port:current.port||undefined,
        method:"GET",
        path:current.pathname+current.search,
        headers:requestHeaders,
        lookup:(_hostname,_options,callback)=>{
          if((_options as {all?:boolean}).all){
            (callback as any)(null,[{address:resolved.address,family:resolved.family}]);
          }else{
            callback(null,resolved.address,resolved.family);
          }
        },
        ...(current.protocol==="https:"?{servername:current.hostname}:{}),
      },response=>{
        const chunks:Buffer[]=[];
        let size=0;
        const declaredLength=Number(response.headers["content-length"]||0);
        if(Number.isFinite(declaredLength)&&declaredLength>maxBytes){response.resume();finish(new Error("Response is too large."));return;}
        response.on("data",(chunk:Buffer|string)=>{
          const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
          size+=buffer.length;
          if(size>maxBytes){req.destroy();finish(new Error("Response is too large."));return;}
          chunks.push(buffer);
        });
        response.on("end",()=>finish(undefined,{status:response.statusCode||0,headers:response.headers as Record<string,string|string[]|undefined>,body:Buffer.concat(chunks).toString("utf8")}));
        response.on("error",error=>finish(error));
      });
      req.setTimeout(8000,()=>req.destroy(new Error("Website request timed out.")));
      req.on("error",error=>finish(error));
      req.end();
    });

    if([301,302,303,307,308].includes(result.status)){
      const location=Array.isArray(result.headers.location)?result.headers.location[0]:result.headers.location;
      if(!location) throw new Error("Redirect without location.");
      current=new URL(location,current);
      if(!["http:","https:"].includes(current.protocol)) throw new Error("Only HTTP and HTTPS URLs are allowed.");
      if(current.username||current.password) throw new Error("Website credentials in URLs are not allowed.");
      continue;
    }
    if(result.status<200||result.status>=300) throw new Error("HTTP "+result.status);
    return {text:result.body,url:current.toString()};
  }
  throw new Error("Too many redirects.");
}

export function parseGitHubUrl(value:string){
  try{
    const url=new URL(value);
    if(url.hostname.toLowerCase()!=="github.com") return null;
    const parts=url.pathname.split("/").filter(Boolean);
    if(parts.length<2) return null;
    const owner=parts[0],repo=parts[1].replace(/\.git$/i,"");
    if(!/^[A-Za-z0-9_.-]+$/.test(owner)||!/^[A-Za-z0-9_.-]+$/.test(repo)) return null;
    return {owner,repo,fullName:owner+"/"+repo,url:"https://github.com/"+owner+"/"+repo};
  }catch{return null;}
}

async function github(path:string){
  const response=await fetch(GITHUB_API+path,{headers:{accept:"application/vnd.github+json","user-agent":"ProjectHub-Verifier/1.0","x-github-api-version":"2026-03-10"},signal:AbortSignal.timeout(8000)});
  if(!response.ok) throw new Error("GitHub API HTTP "+response.status);
  return response.json() as Promise<Record<string,any>>;
}
export async function verifyGitHub(url:string,token:string):Promise<VerificationResult>{
  const parsed=parseGitHubUrl(url);
  if(!parsed) return {status:"failed",evidence:{},failure_reason:"Invalid GitHub repository URL."};
  try{
    const repo=await github("/repos/"+encodeURIComponent(parsed.owner)+"/"+encodeURIComponent(parsed.repo));
    const evidence:any={repository:repo.full_name,owner:repo.owner?.login,visibility:repo.visibility,fork:!!repo.fork,default_branch:repo.default_branch};
    if(repo.fork){evidence.parent=repo.parent?.full_name||null;evidence.source=repo.source?.full_name||null;}
    let control=false;
    try{
      const content=await github("/repos/"+parsed.owner+"/"+parsed.repo+"/contents/.projecthub-verification");
      const raw=typeof content.content==="string"?Buffer.from(content.content.replace(/\s/g,""),"base64").toString("utf8"):"";
      control=raw.trim()===token;
      evidence.verification_file=control?"matched":"present_but_mismatch";
    }catch{evidence.verification_file="missing_or_inaccessible";}
    if(control) return {status:"verified",method:"github_file",evidence};
    return {status:"pending",method:"github_file",evidence,failure_reason:"Add the ProjectHub verification token to .projecthub-verification in the repository, then check again."};
  }catch(error){return {status:"failed",evidence:{repository:parsed.fullName},failure_reason:error instanceof Error?error.message:"GitHub verification failed."};}
}

function extractGitHubLinks(text:string){
  return [...text.matchAll(/https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/gi)].map(m=>m[1].replace(/\.git$/i,""));
}

export async function verifyWebsite(url:string,token:string,githubFullName?:string):Promise<VerificationResult>{
  try{
    const target=new URL(url);
    if(!["http:","https:"].includes(target.protocol)) throw new Error("Only HTTP and HTTPS websites are allowed.");
    const dnsName="_projecthub-verification."+target.hostname;
    let dnsVerified=false;
    try{dnsVerified=(await resolveTxt(dnsName)).flat().some(value=>value.trim()===token);}catch{}
    if(dnsVerified) return {status:"verified",method:"dns_txt",evidence:{hostname:target.hostname,dns_record:dnsName}};
    const root=await safeFetchText(url);
    const metaTag=/<meta\b[^>]*(?:name|property)=["']projecthub-verification["'][^>]*>/i.exec(root.text)?.[0]||"";
    const meta=metaTag.includes(token);
    let fileVerified=false;
    try{const file=await safeFetchText(new URL("/.well-known/projecthub-verification.txt",root.url).toString(),5000);fileVerified=file.text.trim()===token;}catch{}
    const links=extractGitHubLinks(root.text);
    const crossLink=!!githubFullName&&links.some(link=>link.toLowerCase()===githubFullName.toLowerCase());
    const evidence={hostname:target.hostname,final_url:root.url,meta_verified:meta,file_verified:fileVerified,github_links:links.slice(0,10),cross_link:crossLink};
    if(meta) return {status:"verified",method:"html_meta",evidence};
    if(fileVerified) return {status:"verified",method:"html_file",evidence};
    return {status:"pending",evidence,failure_reason:"Add the ProjectHub verification token as a DNS TXT record, HTML meta tag, or .well-known verification file, then check again."};
  }catch(error){return {status:"failed",evidence:{},failure_reason:error instanceof Error?error.message:"Website verification failed."};}
}

export function deriveOverallStatus(github:string,website:string,provenance:string){
  if(provenance==="review") return "review_required";
  if(github==="verified"&&(website==="verified"||website==="not_required")) return "verified";
  if(website==="verified"&&github==="not_required") return "verified";
  if(github==="verified"||website==="verified") return "partially_verified";
  if((github==="failed"&& (website==="failed"||website==="not_required")) || (website==="failed"&&github==="not_required")) return "verification_required";
  return "pending";
}
