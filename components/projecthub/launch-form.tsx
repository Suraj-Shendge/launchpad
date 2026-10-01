"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ArrowUpRight, Check, Link2, Loader2, Sparkles, Upload, X } from "lucide-react";
import type { Category } from "@/lib/types";

type Draft={name:string;website_url:string;github_url:string;tagline:string;description:string;category_id:string;tags:string;social_links:string;logo_url:string};
const DRAFT_KEY="projecthub:launch-draft:v1";
const IDB_NAME="projecthub-launch-drafts";
const IDB_STORE="files";

function readStoredDraft():Draft|null {
  try { const raw=localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) as Draft : null; } catch { return null; }
}
function saveStoredDraft(draft:Draft){ try { localStorage.setItem(DRAFT_KEY,JSON.stringify(draft)); } catch {} }
function clearStoredDraft(){ try { localStorage.removeItem(DRAFT_KEY); } catch {} }
function clearFileDraft(){
  if(typeof indexedDB==="undefined") return;
  void openDraftDb().then(db=>new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(IDB_STORE,"readwrite"); tx.objectStore(IDB_STORE).delete("preview-images"); tx.objectStore(IDB_STORE).delete("logo"); tx.oncomplete=()=>{db.close();resolve()}; tx.onerror=()=>{db.close();reject(tx.error)};
  })).catch(()=>{});
}
function saveLogoDraft(file:File|null){
  if(typeof indexedDB==="undefined") return;
  void openDraftDb().then(db=>new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(IDB_STORE,"readwrite");
    if(file) tx.objectStore(IDB_STORE).put(file,"logo"); else tx.objectStore(IDB_STORE).delete("logo");
    tx.oncomplete=()=>{db.close();resolve()}; tx.onerror=()=>{db.close();reject(tx.error)};
  })).catch(()=>{});
}
function openDraftDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(IDB_NAME,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(IDB_STORE);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
function saveFileDraft(files:File[]){
  if(typeof indexedDB==="undefined") return;
  void openDraftDb().then(db=>new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(IDB_STORE,"readwrite"); tx.objectStore(IDB_STORE).put(files, "preview-images"); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error);
  })).catch(()=>{});
}
function readFileDraft():Promise<File[]>{
  if(typeof indexedDB==="undefined") return Promise.resolve([]);
  return openDraftDb().then(db=>new Promise<File[]>((resolve,reject)=>{
    const tx=db.transaction(IDB_STORE,"readonly"); const req=tx.objectStore(IDB_STORE).get("preview-images");
    req.onsuccess=()=>{db.close();resolve((req.result??[]) as File[])}; req.onerror=()=>{db.close();reject(req.error)};
  })).catch(()=>[]);
}
function readLogoDraft():Promise<File|null>{
  if(typeof indexedDB==="undefined") return Promise.resolve(null);
  return openDraftDb().then(db=>new Promise<File|null>((resolve,reject)=>{
    const tx=db.transaction(IDB_STORE,"readonly"); const req=tx.objectStore(IDB_STORE).get("logo");
    req.onsuccess=()=>{db.close();resolve((req.result??null) as File|null)}; req.onerror=()=>{db.close();reject(req.error)};
  })).catch(()=>null);
}
export function LaunchForm({categories,initialUrl=""}:{categories:Category[];initialUrl?:string}) {
  const router=useRouter();
  const [form,setForm]=useState<Draft>({name:"",website_url:initialUrl,github_url:"",tagline:"",description:"",category_id:"",tags:"",social_links:"",logo_url:""});
  const [images,setImages]=useState<File[]>([]);
  const [previews,setPreviews]=useState<string[]>([]);
  const [logoFile,setLogoFile]=useState<File|null>(null);
  const [logoPreview,setLogoPreview]=useState<string|null>(null);
  const [metadataBusy,setMetadataBusy]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  useEffect(()=>{
    const stored=readStoredDraft();
    const hasDraftContent=!!stored&&Object.values(stored).some(value=>value.trim().length>0);
    if(hasDraftContent&&stored){
      setForm(current=>({...current,...stored,website_url:current.website_url||stored.website_url}));
      void readFileDraft().then(files=>{if(files.length){setImages(files);setPreviews(files.map(file=>URL.createObjectURL(file)));}});
      void readLogoDraft().then(file=>{if(file){setLogoFile(file);setLogoPreview(URL.createObjectURL(file));}});
    }else{
      clearFileDraft();
    }
  },[]);

  useEffect(()=>{
    const timer=window.setTimeout(()=>saveStoredDraft(form),120);
    return()=>window.clearTimeout(timer);
  },[form]);

  useEffect(()=>()=>previews.forEach(url=>URL.revokeObjectURL(url)),[previews]);

  function update(key:keyof Draft,value:string){setForm(current=>({...current,[key]:value}));setError("");}
  const canFetch=useMemo(()=>/^https?:\/\//i.test(form.website_url),[form.website_url]);

  async function fetchMetadata(){
    if(!canFetch){setError("Enter a valid project URL first.");return;}
    setMetadataBusy(true);setError("");setNotice("");
    const response=await fetch("/api/metadata?url="+encodeURIComponent(form.website_url));
    const payload=await response.json().catch(()=>({}));
    setMetadataBusy(false);
    if(!response.ok){setError(payload.error||"Metadata could not be fetched.");return;}
    setForm(current=>({...current,name:current.name||payload.title||"",tagline:current.tagline||payload.description?.slice(0,120)||"",description:current.description||payload.description||"",logo_url:current.logo_url||payload.logo||""}));
    setNotice("Metadata fetched. Review the details before launching.");
  }

  function addImages(files:FileList|null){
    if(!files) return;
    const incoming=Array.from(files).filter(file=>file.type.startsWith("image/")).slice(0,4-images.length);
    const tooLarge=incoming.find(file=>file.size>4*1024*1024);
    if(tooLarge){setError("Each preview image must be 4 MB or smaller.");return;}
    const next=[...images,...incoming];
    setImages(next);saveFileDraft(next);setPreviews(next.map(file=>URL.createObjectURL(file)));setError("");
  }
  function removeImage(index:number){
    const next=images.filter((_,i)=>i!==index);
    setImages(next);saveFileDraft(next);setPreviews(next.map(file=>URL.createObjectURL(file)));
  }
  function uploadLogo(file:File|null){
    if(!file) return;
    if(file.size>2*1024*1024){setError("Logo must be 2 MB or smaller.");return;}
    if(!["image/png","image/jpeg","image/webp","image/svg+xml"].includes(file.type)){setError("Logo must be PNG, JPG, WEBP or SVG.");return;}
    if(logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);setLogoPreview(URL.createObjectURL(file));saveLogoDraft(file);setError("");
  }
  function useDetectedLogo(){
    if(logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);setLogoPreview(null);saveLogoDraft(null);setError("");
  }
  async function launchProject(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault(); setBusy(true);setError("");
    saveStoredDraft(form);saveFileDraft(images);
    const supabase=createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setBusy(false);router.push("/login?next=/launch");return;}
    const body=new FormData();
    Object.entries(form).forEach(([key,value])=>body.set(key,value));
    if(logoFile) body.set("logo",logoFile);
    images.forEach(file=>body.append("preview_images",file));
    const response=await fetch("/api/projects",{method:"POST",body});
    const payload=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok){setError(payload.error||"Could not launch your project.");return;}
    clearStoredDraft();
    clearFileDraft();
    setImages([]);setPreviews([]);
    router.push("/dashboard/projects?submitted=1");router.refresh();
  }

  function cancelLaunch(){
    clearStoredDraft();clearFileDraft();setImages([]);setForm({name:"",website_url:"",github_url:"",tagline:"",description:"",category_id:"",tags:"",social_links:"",logo_url:""});
    router.push("/");
  }

  return (
    <form className="launch-form" onSubmit={launchProject}>
      <div className="launch-form-grid">
        <section className="launch-main">
          <div className="launch-step"><span>01</span><div><p className="eyebrow">Project URL</p><h2>Start with your website.</h2><p>We use your URL to detect the title, description and logo so you can get to launch faster.</p></div></div>
          <div className="launch-url-row">
            <div className="input-with-icon"><Link2 size={17}/><input value={form.website_url} onChange={e=>update("website_url",e.target.value)} placeholder="https://yourproject.com" type="url" required/></div>
            <button type="button" className="button-soft" onClick={fetchMetadata} disabled={!canFetch||metadataBusy}>{metadataBusy?<><Loader2 size={15} className="spin"/>Fetching…</>:<><Sparkles size={15}/>Fetch details</>}</button>
          </div>
          {notice&&<p className="form-success"><Check size={14}/>{notice}</p>}
        </section>

        <aside className="launch-side">
          <p className="eyebrow">Launch checklist</p>
          <div className="check-row"><span>URL</span><strong>{form.website_url?"Ready":"Add URL"}</strong></div>
          <div className="check-row"><span>Details</span><strong>{form.name&&form.tagline?"Ready":"Pending"}</strong></div>
          <div className="check-row"><span>Category</span><strong>{form.category_id?"Ready":"Pending"}</strong></div>
          <div className="check-row"><span>GitHub verification</span><strong>{form.github_url?"Required after submit":"Required"}</strong></div>
        </aside>
      </div>
      <section className="launch-details">
        <div className="launch-step"><span>02</span><div><p className="eyebrow">Project details</p><h2>Make the launch page yours.</h2><p>Metadata is a starting point. Everything remains editable before you submit.</p></div></div>
        <div className="launch-requirement-note"><div><strong>GitHub verification is mandatory.</strong><span>Every ProjectHub launch must include a GitHub repository you control. You can submit before verification, but publication requires successful GitHub verification.</span></div></div>
        <div className="form-grid">
          <label>Project name<input value={form.name} onChange={e=>update("name",e.target.value)} maxLength={80} placeholder="Your project" required/></label>
          <label>Category<select value={form.category_id} onChange={e=>update("category_id",e.target.value)} required><option value="">Choose a category</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        </div>
        <label>Tagline<input value={form.tagline} onChange={e=>update("tagline",e.target.value)} maxLength={120} placeholder="One clear sentence about what it does" required/></label>
        <label>Description<textarea value={form.description} onChange={e=>update("description",e.target.value)} rows={7} maxLength={4000} placeholder="Explain the product, who it is for, and why it exists." required/></label>
        <div className="form-grid">
          <label>Tags<input value={form.tags} onChange={e=>update("tags",e.target.value)} placeholder="ai, saas, productivity"/></label>
          <label className="required-field"><span className="field-label-row"><span>GitHub repository</span><span className="field-required">Required</span></span><input value={form.github_url} onChange={e=>update("github_url",e.target.value)} placeholder="https://github.com/you/project" type="url" required/><small><strong>GitHub verification is mandatory.</strong> After you submit, ProjectHub gives you a unique token. Add it to the repository to verify control. Your project can enter moderation before verification, but it cannot be published until GitHub verification succeeds. Forks are detected separately.</small></label>
        </div>
        <label>Social links<input value={form.social_links} onChange={e=>update("social_links",e.target.value)} placeholder="x=https://x.com/…, linkedin=https://…"/></label>
      </section>

      <section className="launch-assets">
        <div className="launch-step"><span>03</span><div><p className="eyebrow">Visuals</p><h2>Choose the face of the project.</h2><p>Preview the detected logo, then add screenshots or informational images to your project page.</p></div></div>
        <div className="asset-grid">
          <div className="logo-preview-card">
            <div className="asset-label"><span>{logoFile?"Custom logo":"Detected logo"}</span>{(logoFile||form.logo_url)&&<span className="asset-badge">Ready</span>}</div>
            {logoPreview?<img src={logoPreview} alt="Custom project logo preview" className="detected-logo"/>:form.logo_url?<img src={form.logo_url} alt="Detected project logo" className="detected-logo"/>:<div className="detected-logo-placeholder">P</div>}
            <div className="logo-actions">
              <label className="logo-upload-button"><Upload size={14}/><span>Upload different logo</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e=>uploadLogo(e.target.files?.[0]||null)}/></label>
              {logoFile&&<button type="button" className="text-button" onClick={useDetectedLogo}>Use detected logo</button>}
            </div>
            <p>{logoFile?"Using your uploaded logo. PNG, JPG, WEBP or SVG · up to 2 MB.":"We detected this from your site metadata. Upload a different logo whenever you like."}</p>
          </div>
          <div className="upload-card">
            <div className="asset-label"><span>Project images</span><span>{images.length}/4</span></div>
            <label className="upload-drop"><Upload size={19}/><strong>Upload preview images</strong><span>PNG, JPG or WEBP · up to 4 images</span><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={e=>addImages(e.target.files)}/></label>
            {previews.length>0&&<div className="preview-strip">{previews.map((src,index)=><div className="preview-thumb" key={src}><img src={src} alt="" /><button type="button" onClick={()=>removeImage(index)} aria-label="Remove image"><X size={13}/></button></div>)}</div>}
          </div>
        </div>
      </section>
      <section className="launch-review">
        <div>
          <p className="eyebrow">04 · Ready to launch</p>
          <h2>Submit for moderation.</h2>
          <p>Your project enters moderation after submission. GitHub verification is mandatory before an approved project can be published across ProjectHub.</p>
        </div>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <div className="launch-actions">
          <button type="button" className="button-outline" onClick={cancelLaunch}><ArrowLeft size={15}/>Cancel</button>
          <button className="button-primary" disabled={busy}>{busy?<><Loader2 size={15} className="spin"/>Launching…</>:<>Launch Project <ArrowUpRight size={15}/></>}</button>
        </div>
        <p className="launch-auth-note">You can fill everything as a guest. We’ll ask you to log in only when you press Launch Project, and your draft will stay saved.</p>
      </section>
    </form>
  );
}
