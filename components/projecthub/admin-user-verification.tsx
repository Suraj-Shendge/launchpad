"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminUserVerification({userId,initial}:{userId:string;initial:"none"|"member"|"founder"|"entrepreneur"|"celebrity"}){
 const [tier,setTier]=useState(initial),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const router=useRouter();
 async function update(value:"none"|"member"|"founder"|"entrepreneur"|"celebrity"){
  setTier(value);setBusy(true);setMessage("");
  const res=await fetch("/api/admin/users/"+userId+"/verification",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({verification_tier:value})});
  const body=await res.json().catch(()=>({}));setBusy(false);setMessage(res.ok?"Saved.":(body.error||"Could not update."));
  if(res.ok)router.refresh();
 }
 return <div className="admin-verification-control"><select value={tier} onChange={e=>void update(e.target.value as "none"|"member"|"founder"|"entrepreneur"|"celebrity")} disabled={busy}><option value="none">Automatic tier</option><option value="member">Manual member tick</option><option value="founder">Manual founder tick</option><option value="entrepreneur">Manual entrepreneur tick</option><option value="celebrity">Gold dev / community tick</option></select>{message&&<span>{message}</span>}</div>;
}
