"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EditProjectForm({project,categoryOptions}:{project:any;categoryOptions:{id:string;name:string}[]}) {
  const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const router=useRouter();
  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const form=new FormData(e.currentTarget);
    const body=Object.fromEntries(form.entries());if(body.website_url===undefined)body.website_url="";
    const res=await fetch("/api/projects/"+project.id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
    const payload=await res.json().catch(()=>({}));
    setBusy(false);
    if(!res.ok){setError(payload.error||"Could not save changes.");return}
    router.push("/dashboard/projects"); router.refresh();
  }
  return <form className="project-form" onSubmit={submit}>
    <label>Project name<input name="name" defaultValue={project.name} required maxLength={80}/></label>
    <label>Tagline<input name="tagline" defaultValue={project.tagline} required maxLength={120}/></label>
    <label>Description<textarea name="description" defaultValue={project.description} rows={8} required maxLength={4000}/></label>
    <div className="form-grid"><label>Website URL <span className="field-optional">Optional</span><input name="website_url" type="url" defaultValue={project.website_url||""} placeholder="https://yourproject.com"/></label><label>Category<select name="category_id" defaultValue={project.category_id}>{categoryOptions.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <button className="button-primary" disabled={busy}>{busy?"Saving…":"Save changes"}</button>
  </form>;
}
