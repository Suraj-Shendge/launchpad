import { resolve4, resolve6, resolveTxt } from "node:dns/promises";
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
  if(v==="localhost"||v==="::1"||v.startsWith("fc")||v.startsWith("fd")||v.startsWith("fe80:")) return true;
  const parts=v.split(".").map(Number);
  if(parts.length!==4||parts.some(Number.isNaN)) return false;
  const [x,y]=parts;
  return x===10||x===127||(x===169&&y===254)||(x===172&&y>=16&&y<=31)||(x===192&&y===168)||x===0;
}

async function assertPublicHost(hostname:string){
  const normalized=hostname.replace(/^\[|\]$/g,"").toLowerCase();
  if(normalized==="localhost"||normalized.endsWith(".localhost")||normalized.endsWith(".local")) throw new Error("Private hostname is not allowed.");
  if(isIP(normalized)===4||isIP(normalized)===6) if(isPrivateIp(normalized)) throw new Error("Private network target is not allowed.");
  const results=await Promise.allSettled([resolve4(normalized),resolve6(normalized)]);
  for(const result of results) if(result.status==="fulfilled") for(const ip of result.value) if(isPrivateIp(ip)) throw new Error("Private network target is not allowed.");
}

export async function safeFetchText(input:string,maxBytes=250_000){
  let current=new URL(input);
  if(!["http:","https:"].includes(current.protocol)) throw new Error("Only HTTP and HTTPS URLs are allowed.");
  for(let hop=0;hop<=MAX_REDIRECTS;hop++){
    await assertPublicHost(current.hostname);
    const response=await fetch(current,{redirect:"manual",headers:{"user-agent":"ProjectHub-Verifier/1.0","accept":"text/html,text/plain;q=0.9,*/*;q=0.5"},signal:AbortSignal.timeout(8000)});
    if([301,302,303,307,308].includes(response.status)){
      const location=response.headers.get("location"); if(!location) throw new Error("Redirect without location.");
      current=new URL(location,current); continue;
    }
    if(!response.ok) throw new Error("HTTP "+response.status);
    const length=Number(response.headers.get("content-length")||0);
    if(length>maxBytes) throw new Error("Response is too large.");
    const text=await response.text();
    if(new TextEncoder().encode(text).byteLength>maxBytes) throw new Error("Response is too large.");
    return {response,text,url:current.toString()};
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
  if(github==="verified"&&(website==="verified"||website==="not_required")&&provenance!=="review") return "verified";
  if(provenance==="review") return "review_required";
  if(github==="verified"||website==="verified") return "partially_verified";
  if(github==="failed"&&website==="failed") return "verification_required";
  return "pending";
}
