"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AdminSettingsForm({items,canEdit=true}:{items:{key:string;value:unknown}[];canEdit?:boolean}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const router=useRouter();const initial=Object.fromEntries(items.map(x=>[x.key,String(x.value).replace(/^\"|\"$/g,"")]));const [values,setValues]=useState<Record<string,string>>(initial);
 async function save(e:React.FormEvent){e.preventDefault();if(!canEdit)return;setBusy(true);setMessage("");const res=await fetch("/api/admin/settings",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(values)});const p=await res.json().catch(()=>({}));setBusy(false);setMessage(res.ok?"Saved.":(p.error||"Could not save."));if(res.ok)router.refresh()}
 return <form className="settings-edit" onSubmit={save}>{!canEdit&&<div className="admin-readonly-note">View-only access. You can inspect these settings but cannot change them.</div>}{items.map(item=><label key={item.key}>{item.key}<input value={values[item.key]??""} onChange={e=>setValues(v=>({...v,[item.key]:e.target.value}))} disabled={!canEdit||busy}/></label>)}{canEdit&&<button className="button-primary" disabled={busy}>{busy?"Saving…":"Save settings"}</button>}{message&&<span className="form-note">{message}</span>}</form>;
}
