"use client";

import { useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Github, Globe2, Loader2, RefreshCw } from "lucide-react";

type Verification={verification_token:string;github_url:string|null;website_url:string|null;github_status:string;website_status:string;cross_link_status:string;provenance_status:string;overall_status:string;github_method:string|null;website_method:string|null;github_evidence:any;website_evidence:any;cross_link_evidence:any};

export function ProjectVerificationPanel({projectId,initial}:{projectId:string;initial:Verification}){
  const [data,setData]=useState(initial); const [busy,setBusy]=useState(""); const [copied,setCopied]=useState(false);
  async function check(type:"github"|"website"|"all"){setBusy(type);const r=await fetch("/api/projects/"+projectId+"/verification",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({check:type})});const j=await r.json().catch(()=>({}));if(r.ok&&j.verification)setData(j.verification);setBusy("");}
  async function copy(){await navigator.clipboard.writeText(data.verification_token);setCopied(true);setTimeout(()=>setCopied(false),1200);}
  const badge=(status:string)=>status==="verified"?"verified":status==="failed"?"failed":"pending";
  return <div className="verification-panel">
    <div className="verification-summary"><div><p className="eyebrow">Ownership status</p><h2>{data.overall_status.replaceAll("_"," ")}</h2><p>ProjectHub verifies GitHub repository control. Website ownership is optional and is only checked when a website is supplied.</p></div><button className="button-soft" onClick={()=>check("all")} disabled={!!busy}>{busy?<Loader2 size={15} className="spin"/>:<RefreshCw size={15}/>}Check everything</button></div>
    <div className="verification-grid">
      <section className="verification-card"><div className="verification-card-head"><div><Github size={18}/><h3>GitHub repository</h3></div><span className={"verification-badge "+badge(data.github_status)}>{data.github_status}</span></div>
        <a href={data.github_url||"#"} target="_blank" rel="noreferrer">{data.github_url||"No GitHub repository supplied"} {data.github_url&&<ExternalLink size={13}/>}</a>
        {data.github_evidence?.fork&&<p className="verification-warning">This repository is a fork of <strong>{data.github_evidence.parent||"an upstream repository"}</strong>. Repository control is verified separately from provenance.</p>}
        <div className="verification-token"><div><small>Verification file token</small><code>{data.verification_token}</code></div><button onClick={copy} aria-label="Copy token"><Copy size={14}/>{copied?"Copied":"Copy"}</button></div>
        <p className="verification-help">Create a file named <code>.projecthub-verification</code> in the repository root containing only this token, commit it, then run the check.</p>
        <button className="text-link" onClick={()=>check("github")} disabled={!data.github_url||!!busy}>{busy==="github"?<Loader2 size={14} className="spin"/>:<RefreshCw size={14}/>} Verify GitHub</button>
      </section>
      {data.website_url&&<section className="verification-card"><div className="verification-card-head"><div><Globe2 size={18}/><h3>Website ownership</h3></div><span className={"verification-badge "+badge(data.website_status)}>{data.website_status}</span></div>
        <a href={data.website_url||"#"} target="_blank" rel="noreferrer">{data.website_url||"No website supplied"} {data.website_url&&<ExternalLink size={13}/>}</a>
        <div className="verification-methods"><strong>Choose one:</strong><span>DNS TXT: <code>_projecthub-verification</code> = token</span><span>HTML meta: <code>&lt;meta name="projecthub-verification" content="TOKEN"&gt;</code></span><span>File: <code>/.well-known/projecthub-verification.txt</code></span></div>
        <button className="text-link" onClick={()=>check("website")} disabled={!data.website_url||!!busy}>{busy==="website"?<Loader2 size={14} className="spin"/>:<RefreshCw size={14}/>} Verify website</button>
      </section>}
      {!data.website_url&&<section className="verification-card verification-not-required"><div className="verification-card-head"><div><Globe2 size={18}/><h3>Website ownership</h3></div><span className="verification-badge verified">not required</span></div><p>This project has no website. No website ownership check is needed for moderation or publication.</p></section>}
    </div>
    <div className="verification-evidence"><div><span>Cross-link</span><strong>{data.website_url?data.cross_link_status:"not required"}</strong></div><div><span>Provenance</span><strong>{data.provenance_status}</strong></div><div><span>GitHub method</span><strong>{data.github_method||"—"}</strong></div><div><span>Website method</span><strong>{data.website_method||"—"}</strong></div></div>
  </div>;
}
