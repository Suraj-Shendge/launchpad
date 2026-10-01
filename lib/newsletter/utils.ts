import { createHash, randomBytes } from "node:crypto";

export function normalizeEmail(value:string){return value.trim().toLowerCase();}
export function createToken(){return randomBytes(32).toString("base64url");}
export function hashToken(value:string){return createHash("sha256").update(value).digest("hex");}

export function slugify(value:string){
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90)||"newsletter";
}

export function excerpt(value:string,length=170){
  const text=value.replace(/\s+/g," ").trim();
  return text.length>length?text.slice(0,length-1).trimEnd()+"…":text;
}

export function escapeHtml(value:string){
  return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
