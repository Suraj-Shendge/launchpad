"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { hasEnvVars } from "@/lib/utils";

export function ForgotPasswordForm(){
  const [email,setEmail]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setBusy(true); setMessage(""); setError("");
    if(!hasEnvVars){setBusy(false);setError("Authentication is not configured yet. Connect Supabase to enable password recovery.");return;}
    const {error}=await createClient().auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/auth/update-password`});
    setBusy(false);
    if(error){setError(error.message);return;}
    setMessage("If an account exists for that email, a password reset link has been sent.");
  }

  return <form className="auth-form" onSubmit={submit}>
    <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label>
    {error&&<p className="form-error" role="alert">{error}</p>}
    {message&&<p className="form-success" role="status">{message}</p>}
    <button className="button-primary" disabled={busy}>{busy?"Sending…":"Send reset link"}</button>
    <p className="form-switch"><Link href="/login">Back to login</Link></p>
  </form>;
}
