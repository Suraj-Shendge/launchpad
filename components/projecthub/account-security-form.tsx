"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AccountSecurityForm({email}:{email:string}){
 const [currentEmail,setCurrentEmail]=useState(email);
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 async function save(e:React.FormEvent){
  e.preventDefault();setMessage("");
  if(password && password!==confirm){setMessage("Passwords do not match.");return;}
  if(password && password.length<8){setMessage("Password must be at least 8 characters.");return;}
  setBusy(true);
  const supabase=createClient(); let nextMessage="";
  if(currentEmail.trim() && currentEmail.trim()!==email){
   const {error}=await supabase.auth.updateUser({email:currentEmail.trim()});
   if(error){setBusy(false);setMessage(error.message);return;}
   nextMessage="Check your new email for a confirmation link.";
  }
  if(password){
   const {error}=await supabase.auth.updateUser({password});
   if(error){setBusy(false);setMessage(error.message);return;}
   nextMessage=nextMessage?"Email and password updated. Check your new email for confirmation.":"Password updated.";
   setPassword("");setConfirm("");
  }
  if(!password && currentEmail.trim()===email && !nextMessage) nextMessage="No changes to save.";
  setBusy(false);setMessage(nextMessage);
 }
 return <form className="settings-form" onSubmit={save}>
  <div className="settings-field"><label>Email address<input type="email" value={currentEmail} onChange={e=>setCurrentEmail(e.target.value)} autoComplete="email"/></label><p>Changing your email may require confirmation before the new address becomes active.</p></div>
  <div className="settings-form-divider"/>
  <div className="settings-field"><label>New password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} autoComplete="new-password" placeholder="Leave blank to keep your current password"/></label></div>
  <div className="settings-field"><label>Confirm new password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={8} autoComplete="new-password" placeholder="Repeat your new password"/></label></div>
  <div className="settings-form-actions"><button className="button-primary" disabled={busy}>{busy?"Updating…":"Save security settings"}</button>{message&&<p className="form-note" role="status">{message}</p>}</div>
 </form>;
}
