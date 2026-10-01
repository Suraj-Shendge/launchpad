"use client";

import { useState } from "react";
import { UserPlus, UserRoundCheck, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type FollowingType="user"|"forum"|"project"|"category";

export function FollowButton({followingType,targetId,initialFollowing=false,initialCount=0}:{
 followingType:FollowingType;targetId:string;initialFollowing?:boolean;initialCount?:number;
}){
 const [following,setFollowing]=useState(initialFollowing);
 const [count,setCount]=useState(initialCount);
 const [busy,setBusy]=useState(false);

 async function toggle(){
  if(busy)return;
  setBusy(true);
  const supabase=createClient();
  const {data:user}=await supabase.auth.getUser();
  if(!user.user){window.location.href="/login?next="+encodeURIComponent(window.location.pathname);return;}
  const {data,error}=await supabase.rpc("toggle_follow",{p_following_type:followingType,p_following_id:targetId});
  if(!error){
   const next=Boolean(data);
   setFollowing(next);
   const {data:total}=await supabase.rpc("get_follow_count",{p_following_type:followingType,p_following_id:targetId});
   setCount(Number(total??0));
  }
  setBusy(false);
 }
 return <button type="button" className={"follow-button"+(following?" is-following":"")} onClick={toggle} disabled={busy} aria-pressed={following}>
  {busy?<Loader2 size={14} className="spin"/>:following?<UserRoundCheck size={14}/>:<UserPlus size={14}/>}
  <span>{following?"Following":"Follow"}</span>{count>0&&<small>{count}</small>}
 </button>;
}
