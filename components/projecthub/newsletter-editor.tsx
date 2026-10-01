"use client";

import { useState } from "react";
import type { NewsletterBlock, NewsletterContent } from "@/lib/newsletter/types";

type Edition={id:string;type:"digest"|"announcement";title:string;subject:string;preview_text:string|null;content:NewsletterContent;status:string;scheduled_at:string|null;sent_at:string|null;recipient_count:number;last_error:string|null};
type Props={initial:Edition;canSend:boolean};

const newBlock=(type:NewsletterBlock["type"],id:string):NewsletterBlock=>{
 if(type==="hero")return{id,type,eyebrow:"ProjectHub Newsletter",title:"What’s new this week.",body:"A curated update from ProjectHub.",ctaLabel:"Explore ProjectHub",ctaUrl:"/explore"};
 if(type==="text")return{id,type,eyebrow:"ProjectHub",title:"An update worth sharing.",body:"Write your editorial message here."};
 if(type==="projects")return{id,type,heading:"Featured projects",items:[]};
 if(type==="community")return{id,type,heading:"From the community",items:[]};
 return{id,type,title:"Keep building.",body:"Discover more on ProjectHub.",label:"Explore ProjectHub",url:"/explore"};
};

export function NewsletterEditor({initial,canSend}:Props){
 const [title,setTitle]=useState(initial.title),[subject,setSubject]=useState(initial.subject),[preview,setPreview]=useState(initial.preview_text||""),[type,setType]=useState(initial.type),[blocks,setBlocks]=useState(initial.content.blocks),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState(""),[schedule,setSchedule]=useState(""),[suggestions,setSuggestions]=useState<any>(null);

 const api=async(method:"PUT"|"GET",body?:unknown)=>{
  const r=await fetch("/api/admin/newsletter/"+initial.id,{method,headers:body?{"content-type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});
  const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p.error||"Request failed.");return p;
 };
 const save=async()=>{setBusy(true);setMessage("");setError("");try{await api("PUT",{title,subject,previewText:preview,type,content:{version:1,blocks}});setMessage("Saved.");}catch(e){setError(e instanceof Error?e.message:"Could not save.");}finally{setBusy(false)}};
 const action=async(body:any,success:string)=>{setBusy(true);setMessage("");setError("");try{await api("PUT",body);setMessage(success);window.location.reload();}catch(e){setError(e instanceof Error?e.message:"Action failed.");}finally{setBusy(false)}};
 const loadSuggestions=async()=>{setBusy(true);try{const r=await fetch("/api/admin/newsletter/suggestions");const p=await r.json();if(!r.ok)throw new Error(p.error);setSuggestions(p);}catch(e){setError(e instanceof Error?e.message:"Could not load suggestions.");}finally{setBusy(false)}};
 const addSuggestion=(kind:"newProjects"|"newVotes"|"community")=>{
  if(!suggestions)return;
  setBlocks(current=>{
   const desiredType=kind==="community"?"community":"projects";
   let next=[...current],idx=next.findIndex(x=>x.type===desiredType);
   if(idx<0){next.push(newBlock(desiredType,"block-"+Date.now()) as NewsletterBlock);idx=next.length-1;}
   const block=next[idx] as any;
   if(desiredType==="projects"){
    const items=kind==="newVotes"?suggestions.newVotes:suggestions.newProjects;
    const mapped=items.slice(0,6).map((p:any)=>({projectId:p.id,title:p.name,tagline:p.tagline||"",excerpt:p.description||"",imageUrl:p.card_background_image_url||p.screenshot_url||p.logo_url||null,href:"/projects/"+p.slug}));
    next[idx]={...block,items:[...block.items,...mapped.filter((x:any)=>!block.items.some((y:any)=>y.projectId===x.projectId))]};
   }else{
    const mapped=suggestions.community.slice(0,6).map((t:any)=>({threadId:t.id,title:t.title,excerpt:t.content||"",href:"/community/t/"+t.id}));
    next[idx]={...block,items:[...block.items,...mapped.filter((x:any)=>!block.items.some((y:any)=>y.threadId===x.threadId))]};
   }
   return next;
  });
 };
 const updateBlock=(i:number,patch:any)=>setBlocks(v=>v.map((b,n)=>n===i?{...b,...patch}:b));
 const move=(i:number,dir:-1|1)=>setBlocks(v=>{const n=i+dir;if(n<0||n>=v.length)return v;const a=[...v],[x]=a.splice(i,1);a.splice(n,0,x);return a});
 const remove=(i:number)=>setBlocks(v=>v.filter((_,n)=>n!==i));
 return <div className="newsletter-editor">
  <div className="newsletter-editor-main">
   <div className="admin-card"><div className="newsletter-form-grid"><label>Edition type<select value={type} onChange={e=>setType(e.target.value as any)} disabled={initial.status==="sent"}><option value="digest">Digest</option><option value="announcement">Announcement</option></select></label><label>Title<input value={title} onChange={e=>setTitle(e.target.value)} disabled={initial.status==="sent"}/></label><label>Subject<input value={subject} onChange={e=>setSubject(e.target.value)} disabled={initial.status==="sent"}/></label><label>Preview text<input value={preview} onChange={e=>setPreview(e.target.value)} disabled={initial.status==="sent"}/></label></div></div>
   <div className="newsletter-builder-head"><div><p className="eyebrow">Content blocks</p><h2>Editorial canvas.</h2></div><button type="button" className="button-outline" onClick={loadSuggestions} disabled={busy||initial.status==="sent"}>Suggest content</button></div>
   {suggestions&&<div className="newsletter-suggestion-bar"><span><strong>Suggestions ready.</strong> Add them to this edition, then edit anything you need.</span><div><button type="button" className="admin-text-button" onClick={()=>addSuggestion("newProjects")}>New projects</button><button type="button" className="admin-text-button" onClick={()=>addSuggestion("newVotes")}>Notable projects</button><button type="button" className="admin-text-button" onClick={()=>addSuggestion("community")}>Community</button></div></div>}
   <div className="newsletter-block-editor">{blocks.map((block,i)=><div className="newsletter-block-editor-card" key={block.id}><div className="newsletter-block-editor-head"><span>{block.type}</span><div><button type="button" className="admin-text-button" onClick={()=>move(i,-1)}>↑</button><button type="button" className="admin-text-button" onClick={()=>move(i,1)}>↓</button>{initial.status!=="sent"&&<button type="button" className="admin-text-button" onClick={()=>remove(i)}>Remove</button>}</div></div>
    {block.type==="hero"&&<div className="newsletter-block-fields"><label>Eyebrow<input value={block.eyebrow} disabled={initial.status==="sent"} onChange={e=>updateBlock(i,{eyebrow:e.target.value})}/></label><label>Title<input value={block.title} disabled={initial.status==="sent"} onChange={e=>updateBlock(i,{title:e.target.value})}/></label><label className="full">Body<textarea value={block.body} disabled={initial.status==="sent"} onChange={e=>updateBlock(i,{body:e.target.value})}/></label><label>CTA label<input value={block.ctaLabel||""} disabled={initial.status==="sent"} onChange={e=>updateBlock(i,{ctaLabel:e.target.value})}/></label><label>CTA URL<input value={block.ctaUrl||""} disabled={initial.status==="sent"} onChange={e=>updateBlock(i,{ctaUrl:e.target.value})}/></label></div>}
    {block.type==="text"&&<div className="newsletter-block-fields"><label>Eyebrow<input value={block.eyebrow} disabled={initial.status==="sent"} onChange={e=>updateBlock(i,{eyebrow:e.target.value})}/></label><label>Title<input value={block.title} disabled={initial.status==="sent"} onChange={e=>updateBlock(i,{title:e.target.value})}/></label><label className="full">Body<textarea value={block.body} disabled={initial.status==="sent"} onChange={e=>updateBlock(i,{body:e.target.value})}/></label></div>}
    {block.type==="projects"&&<div><label>Heading<input value={block.heading} disabled={initial.status==="sent"} onChange={e=>updateBlock(i,{heading:e.target.value})}/></label><div className="newsletter-editor-items">{block.items.map((item,j)=><div className="newsletter-editor-item" key={item.projectId}><strong>{item.title}</strong><input value={item.tagline} disabled={initial.status==="sent"} onChange={e=>{const items=[...block.items];items[j]={...items[j],tagline:e.target.value};updateBlock(i,{items})}}/><button type="button" className="admin-text-button" onClick={()=>updateBlock(i,{items:block.items.filter((_,n)=>n!==j)})}>Remove</button></div>)}</div></div>}
    {block.type==="community"&&<div><label>Heading<input value={block.heading} disabled={initial.status==="sent"} onChange={e=>updateBlock(i,{heading:e.target.value})}/></label><div className="newsletter-editor-items">{block.items.map((item,j)=><div className="newsletter-editor-item" key={item.threadId}><strong>{item.title}</strong><textarea value={item.excerpt} disabled={initial.status==="sent"} onChange={e=>{const items=[...block.items];items[j]={...items[j],excerpt:e.target.value};updateBlock(i,{items})}}/><button type="button" className="admin-text-button" onClick={()=>updateBlock(i,{items:block.items.filter((_,n)=>n!==j)})}>Remove</button></div>)}</div></div>}
    {block.type==="cta"&&<div className="newsletter-block-fields"><label>Title<input value={block.title} disabled={initial.status==="sent"} onChange={e=>updateBlock(i,{title:e.target.value})}/></label><label>Button label<input value={block.label} disabled={initial.status==="sent"} onChange={e=>updateBlock(i,{label:e.target.value})}/></label><label className="full">Body<textarea value={block.body} disabled={initial.status==="sent"} onChange={e=>updateBlock(i,{body:e.target.value})}/></label><label className="full">URL<input value={block.url} disabled={initial.status==="sent"} onChange={e=>updateBlock(i,{url:e.target.value})}/></label></div>}
   </div>)}</div>
   {initial.status!=="sent"&&<div className="newsletter-add-blocks">{(["hero","text","projects","community","cta"] as const).map(typeName=><button type="button" key={typeName} className="button-outline" onClick={()=>setBlocks(v=>[...v,newBlock(typeName,"block-"+Date.now()+"-"+v.length)])}>+ {typeName}</button>)}</div>}
  </div>
  <aside className="newsletter-editor-sidebar"><div className="admin-card"><p className="eyebrow">Edition</p><div className="newsletter-status-line"><span className={"admin-status "+(initial.status==="sent"?"success":initial.status==="scheduled"?"info":"warning")}>{initial.status}</span>{initial.recipient_count>0&&<span>{initial.recipient_count} recipients</span>}</div><div className="newsletter-editor-actions">{initial.status!=="sent"&&<button className="button-primary" disabled={busy} onClick={save}>Save draft</button>}<a className="button-outline newsletter-preview-link" href={"/api/admin/newsletter/"+initial.id+"/preview"} target="_blank" rel="noreferrer">Preview email ↗</a>{initial.status!=="sent"&&<button className="button-outline" disabled={busy} onClick={()=>action({action:"test"},"Test sent.")}>Send test</button>}{canSend&&initial.status==="draft"&&<button className="button-primary" disabled={busy} onClick={()=>{if(confirm("Send this newsletter now to all confirmed subscribers?"))action({action:"send"},"Newsletter sent.")}}>Send now</button>}{canSend&&initial.status==="draft"&&<div className="newsletter-schedule-box"><label>Schedule send (IST)<input type="datetime-local" value={schedule} onChange={e=>setSchedule(e.target.value)}/></label><button className="button-outline" disabled={busy||!schedule} onClick={()=>action({action:"schedule",scheduledAt:new Date(schedule+":00+05:30").toISOString()},"Newsletter scheduled.")}>Schedule</button></div>}{canSend&&initial.status==="scheduled"&&<button className="button-outline" disabled={busy} onClick={()=>{if(confirm("Cancel this scheduled send?"))action({action:"cancel"},"Schedule cancelled.")}}>Cancel schedule</button>}</div>{message&&<p className="form-note">{message}</p>}{error&&<p className="form-error">{error}</p>}</div></aside>
 </div>;
}
