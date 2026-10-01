"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasEnvVars } from "@/lib/utils";

export function UpdatePasswordForm(){
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const router=useRouter();

  async function submit(e:React.FormEvent){
    e.preventDefault();
    setError("");
    if(password.length<8){setError("Use at least 8 characters.");return;}
    if(password!==confirm){setError("Passwords do not match.");return;}
    if(!hasEnvVars){setError("Authentication is not configured yet. Connect Supabase to change your password.");return;}
    setBusy(true);
    const {error}=await createClient().auth.updateUser({password});
    setBusy(false);
    if(error){setError(error.message);return;}
    router.push("/login?password-reset=1");
  }

  return <form className="auth-form" onSubmit={submit}>
    <label>New password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete="new-password"/></label>
    <label>Confirm password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={8} autoComplete="new-password"/></label>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <button className="button-primary" disabled={busy}>{busy?"Saving…":"Save new password"}</button>
  </form>;
}
