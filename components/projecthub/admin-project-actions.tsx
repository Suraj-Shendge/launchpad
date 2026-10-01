"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminProjectActions({id,status,canApprove,canPublish}:{id:string;status:string;canApprove:boolean;canPublish:boolean}){
 const [busy,setBusy]=useState(false);const router=useRouter();
 async function act(nextStatus:string){
  if(!window.confirm("Change this project status to "+nextStatus+"?"))return;
  setBusy(true);const response=await fetch("/api/admin/projects/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:nextStatus})});
  const payload=await response.json().catch(()=>({}));setBusy(false);if(!response.ok){window.alert(payload.error||"Could not update project.");return}router.refresh();
 }
 if(status==="published")return canPublish?<button onClick={()=>act("archived")} disabled={busy}>Archive</button>:<small>View only</small>;
 if(status==="pending_review")return <div className="admin-inline-actions">{canApprove&&<button onClick={()=>act("published")} disabled={busy}>Approve</button>}{canApprove&&<button onClick={()=>act("rejected")} disabled={busy}>Reject</button>}{!canApprove&&!canPublish&&<small>View only</small>}</div>;
 return <div className="admin-inline-actions">{canPublish&&<button onClick={()=>act("published")} disabled={busy}>Publish</button>}{canPublish&&<button onClick={()=>act("archived")} disabled={busy}>Archive</button>}{!canPublish&&<small>View only</small>}</div>;
}
