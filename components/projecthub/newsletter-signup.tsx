"use client";

import { useState } from "react";

export function NewsletterSignup({compact=false}:{compact?:boolean}){
 const [email,setEmail]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage("");setError("");
  try{
   const r=await fetch("/api/newsletter/subscribe",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email})});
   const p=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(p.error||"Could not start subscription.");
   setMessage("Check your inbox to confirm your subscription.");setEmail("");
  }catch(e){setError(e instanceof Error?e.message:"Could not start subscription.");}
  finally{setBusy(false);}
 }
 return <form className={"newsletter-signup"+(compact?" compact":"")} onSubmit={submit}>
  <div className="newsletter-signup-input"><input aria-label="Email address" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><button className="button-primary" disabled={busy}>{busy?"Sending…":"Subscribe"}</button></div>
  <p>Weekly ProjectHub updates. No spam. Unsubscribe anytime.</p>
  {message&&<span className="form-note newsletter-success" role="status">{message}</span>}
  {error&&<span className="form-error" role="alert">{error}</span>}
 </form>;
}
