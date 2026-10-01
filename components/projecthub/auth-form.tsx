"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Github } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasEnvVars } from "@/lib/utils";

function GoogleMark(){return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M21.35 12.27c0-.78-.07-1.54-.21-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.93v2.43h3.14c1.84-1.7 2.92-4.2 2.92-7.39Z" fill="#4285F4"/><path d="M12 21.75c2.63 0 4.84-.87 6.45-2.35l-3.14-2.43c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.29v2.5A9.75 9.75 0 0 0 12 21.75Z" fill="#34A853"/><path d="M6.54 13.86A5.86 5.86 0 0 1 6.23 12c0-.65.11-1.28.31-1.86v-2.5H3.29A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.04 4.36l3.25-2.5Z" fill="#FBBC05"/><path d="M12 6.11c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.2 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.71 5.39l3.25 2.5C7.31 7.83 9.46 6.11 12 6.11Z" fill="#EA4335"/></svg>}

export function AuthForm({mode}:{mode:"login"|"signup"}) {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [confirmPassword,setConfirmPassword]=useState("");
  const [name,setName]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const [showPassword,setShowPassword]=useState(false); const [showConfirm,setShowConfirm]=useState(false);
  const router=useRouter();
  const nextParam=new URLSearchParams(typeof window!=="undefined"?window.location.search:"").get("next");
  const next=nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

  async function oauth(provider:"github"|"google"){
    if(!hasEnvVars){setError("Authentication is not configured yet. Connect Supabase to enable accounts.");return;}
    setBusy(true);setError("");
    const redirectTo=window.location.origin+"/auth/callback?next="+encodeURIComponent(next);
    const {error}=await createClient().auth.signInWithOAuth({provider,options:{redirectTo}});
    setBusy(false);
    if(error)setError(error.message);
  }
  async function submit(e:React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    if(!hasEnvVars){setBusy(false);setError("Authentication is not configured yet. Connect Supabase to enable accounts.");return;}
    if(mode==="signup"&&password!==confirmPassword){setBusy(false);setError("Passwords do not match.");return;}
    const supabase=createClient();
    const result=mode==="login"
      ? await supabase.auth.signInWithPassword({email,password})
      : await supabase.auth.signUp({email,password,options:{data:{display_name:name}}});
    setBusy(false);
    if(result.error){setError(result.error.message);return}
    if(mode==="signup" && !result.data.session){router.push("/login?check-email=1&next="+encodeURIComponent(next));return}
    router.push(next); router.refresh();
  }
  return <form className="auth-form" onSubmit={submit}>
    <div className="auth-provider-row"><button type="button" className="auth-provider-button" disabled={busy} onClick={()=>void oauth("github")}><Github size={16}/><span>Continue with GitHub</span></button><button type="button" className="auth-provider-button" disabled={busy} onClick={()=>void oauth("google")}><GoogleMark/><span>Continue with Google</span></button></div>
    <div className="auth-divider"><span>or continue with email</span></div>
    {mode==="signup"&&<label>Display name<input value={name} onChange={e=>setName(e.target.value)} required maxLength={60}/></label>}
    <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label>
    <label>Password<div className="password-field"><input type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete={mode==="login"?"current-password":"new-password"}/><button type="button" className="password-toggle" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
    {mode==="signup"&&<label>Confirm password<div className="password-field"><input type={showConfirm?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password"/><button type="button" className="password-toggle" onClick={()=>setShowConfirm(v=>!v)} aria-label={showConfirm?"Hide confirmation password":"Show confirmation password"}>{showConfirm?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>}
    {mode==="login"&&<Link href="/auth/forgot-password" className="auth-muted">Forgot your password?</Link>}
    {error&&<p className="form-error" role="alert">{error}</p>}
    <button className="button-primary" disabled={busy}>{busy?"Working…":mode==="login"?"Log in":"Create account"}</button>
    <p className="form-switch">{mode==="login"?"New to ProjectHub? ":"Already have an account? "}<Link href={mode==="login"?"/signup":"/login"}>{mode==="login"?"Create one":"Log in"}</Link></p>
  </form>;
}
