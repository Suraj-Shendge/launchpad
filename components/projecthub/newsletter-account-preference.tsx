"use client";
import { useState } from "react";

export function NewsletterAccountPreference({initialStatus}:{initialStatus:string|null}){
 const [status,setStatus]=useState(initialStatus||"none"),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function unsubscribe(){setBusy(true);setMessage("");try{const r=await fetch("/api/newsletter/subscription",{method:"DELETE"});const p=await r.json();if(!r.ok)throw new Error(p.error||"Could not update subscription.");setStatus("unsubscribed");setMessage("You are unsubscribed from the ProjectHub Newsletter.");}catch(e){setMessage(e instanceof Error?e.message:"Could not update subscription.");}finally{setBusy(false)}}
 return <div className="newsletter-account-preference"><div><strong>ProjectHub Newsletter</strong><p>A weekly digest of launches, makers and community highlights.</p></div><div className="newsletter-account-preference-actions"><span className={"admin-status "+(status==="subscribed"?"success":"warning")}>{status==="subscribed"?"Subscribed":status==="pending"?"Confirmation pending":status==="unsubscribed"?"Unsubscribed":"Not subscribed"}</span>{status==="subscribed"&&<button className="admin-text-button" disabled={busy} onClick={unsubscribe}>{busy?"Updating…":"Unsubscribe"}</button>}</div>{message&&<small className="form-note">{message}</small>}</div>;
}
