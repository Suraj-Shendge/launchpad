"use client";

import { useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props={projectId:string;initialCount:number;initialUpvoted?:boolean};

export function ProjectUpvoteButton({projectId,initialCount,initialUpvoted=false}:Props){
 const [count,setCount]=useState(initialCount);
 const [upvoted,setUpvoted]=useState(initialUpvoted);
 const [busy,setBusy]=useState(false);

 async function toggle(){
  if(busy)return;
  setBusy(true);
  const supabase=createClient();
  const {data:user}=await supabase.auth.getUser();
  if(!user.user){
   window.location.href="/login?next="+encodeURIComponent(window.location.pathname);
   return;
  }
  const {data,error}=await supabase.rpc("toggle_project_vote",{p_project_id:projectId});
  if(!error&&data){
   setUpvoted(Boolean(data.upvoted));
   setCount(Number(data.upvote_count??0));
  }
  setBusy(false);
 }
 return <button type="button" className={"project-upvote"+(upvoted?" is-upvoted":"")}
  onClick={toggle} aria-label={upvoted?"Remove upvote":"Upvote project"} aria-pressed={upvoted} disabled={busy}>
  {busy?<Loader2 size={14} className="spin"/>:<ArrowUp size={14}/>}<span>{count}</span>
 </button>;
}
