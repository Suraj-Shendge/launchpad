"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AdminAuctionActions({id,status,canManage}:{id:string;status:string;canManage:boolean}){
 const [busy,setBusy]=useState(false);const router=useRouter();
 async function act(action:string){const prompt=action==="cancel"?"Cancel this auction?":action==="extend"?"Extend this auction by the configured window?":action==="settle"?"Settle this ended auction?":"Activate this scheduled auction?";if(!window.confirm(prompt))return;setBusy(true);const response=await fetch("/api/admin/auctions/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action})});const body=await response.json().catch(()=>({}));setBusy(false);if(!response.ok){window.alert(body.error||"Action failed.");return}router.refresh()}
 if(!canManage)return <small>View only</small>;
 return <div className="admin-inline-actions">{status==="scheduled"&&<button disabled={busy} onClick={()=>act("activate")}>Activate</button>}{status==="active"&&<><button disabled={busy} onClick={()=>act("extend")}>Extend</button><button disabled={busy} onClick={()=>act("cancel")}>Cancel</button></>}{status==="ended"&&<button disabled={busy} onClick={()=>act("settle")}>Settle</button>}</div>;
}
