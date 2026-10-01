"use client";

import { useState } from "react";
import { Github, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function GithubConnectButton({connected=false}:{connected?:boolean}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function connect(){
  setBusy(true);setError("");
  const redirectTo=window.location.origin+"/auth/callback?next="+encodeURIComponent("/profile?github=connected");
  const {error}=await createClient().auth.linkIdentity({provider:"github",options:{redirectTo}});
  setBusy(false);if(error)setError(error.message);
 }
 if(connected)return <span className="github-connected"><Github size={14}/> GitHub connected</span>;
 return <div><button type="button" className="github-connect-button" onClick={()=>void connect()} disabled={busy}>{busy?<Loader2 size={14} className="spin"/>:<Github size={14}/>} {busy?"Connecting…":"Connect GitHub for verification"}</button>{error&&<small className="github-connect-error">{error}</small>}</div>;
}
