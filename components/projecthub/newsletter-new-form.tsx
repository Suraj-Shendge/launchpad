"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewsletterNewForm(){
 const router=useRouter();const [type,setType]=useState<"digest"|"announcement">("digest"),[title,setTitle]=useState("ProjectHub Weekly"),[subject,setSubject]=useState("ProjectHub Weekly — launches, makers and community"),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function create(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{const r=await fetch("/api/admin/newsletter",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type,title,subject})});const p=await r.json();if(!r.ok)throw new Error(p.error||"Could not create edition.");router.push("/admin/newsletter/"+p.edition.id);}catch(e){setError(e instanceof Error?e.message:"Could not create edition.");}finally{setBusy(false)}}
 return <form className="admin-card newsletter-new-form" onSubmit={create}><div className="newsletter-form-grid"><label>Edition type<select value={type} onChange={e=>setType(e.target.value as any)}><option value="digest">Weekly digest</option><option value="announcement">Announcement</option></select></label><label>Title<input value={title} onChange={e=>setTitle(e.target.value)} required/></label><label className="full">Subject<input value={subject} onChange={e=>setSubject(e.target.value)} required/></label></div><button className="button-primary" disabled={busy}>{busy?"Creating…":"Create draft"}</button>{error&&<p className="form-error">{error}</p>}</form>;
}
