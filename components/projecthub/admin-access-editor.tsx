"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { ADMIN_PERMISSION_GROUPS, ADMIN_ROLE_PRESETS, type AdminPermission, type AdminRole } from "@/lib/admin-permissions";

const ROLE_LABELS:Record<AdminRole,string>={admin:"Admin",moderator:"Moderator",finance_admin:"Finance Admin",content_admin:"Content Admin",community_admin:"Community Admin",custom:"Custom"};

type Props={userId:string;userName:string;initial:{role:AdminRole|null;permissions:AdminPermission[];expiresAt:string|null}};

export function AdminAccessEditor({userId,userName,initial}:Props){
 const [open,setOpen]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 const [role,setRole]=useState<AdminRole|null>(initial.role);const [permissions,setPermissions]=useState<AdminPermission[]>(initial.permissions);const [expiresAt,setExpiresAt]=useState(initial.expiresAt?new Date(initial.expiresAt).toISOString().slice(0,16):"");
 const granted=new Set(permissions);
 const active=Boolean(role);
 const total=useMemo(()=>permissions.length,[permissions]);
 function chooseRole(value:AdminRole|null){setRole(value);setPermissions(value?ADMIN_ROLE_PRESETS[value]:[]);setMessage("")}
 function toggle(permission:AdminPermission){setPermissions(current=>current.includes(permission)?current.filter(x=>x!==permission):[...current,permission]);setMessage("")}
 async function save(){
  setBusy(true);setMessage("");
  const res=await fetch("/api/admin/users/"+userId+"/access",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({role:role??"none",permissions,expires_at:expiresAt?new Date(expiresAt).toISOString():null})});
  const body=await res.json().catch(()=>({}));setBusy(false);setMessage(res.ok?"Admin access saved.":(body.error||"Could not save admin access."));
  if(res.ok)setOpen(false);
 }
 return <div className="admin-access-editor"><button type="button" className="admin-access-trigger" onClick={()=>setOpen(v=>!v)}><span><ShieldCheck size={14}/>{active?ROLE_LABELS[role!]+" · "+total+" permissions":"No admin access"}</span>{open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>{open&&<div className="admin-access-panel"><div className="admin-access-head"><div><strong>{active?"Manage admin access":"Grant admin access"}</strong><span>{userName}</span></div><button type="button" className="admin-access-remove" onClick={()=>chooseRole(null)}>Remove access</button></div><label className="admin-access-role">Role<select value={role??"none"} onChange={e=>chooseRole(e.target.value==="none"?null:e.target.value as AdminRole)} disabled={busy}><option value="none">No admin access</option>{Object.entries(ROLE_LABELS).filter(([value])=>value!=="custom").map(([value,label])=><option key={value} value={value}>{label}</option>)}<option value="custom">Custom</option></select></label><p className="admin-access-note">Changing the role loads its default permissions. You can then customize them below.</p><div className="admin-access-groups">{ADMIN_PERMISSION_GROUPS.map(group=><section key={group.key}><div className="admin-access-group-title">{group.label}</div>{group.permissions.map(([permission,label])=><label key={permission} className="admin-permission"><input type="checkbox" checked={granted.has(permission)} onChange={()=>toggle(permission)} disabled={!active||busy}/><span>{label}</span><code>{permission}</code></label>)}</section>)}</div><label className="admin-access-role">Expires on (optional)<input type="datetime-local" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} disabled={!active||busy}/></label><div className="admin-access-actions"><button type="button" className="admin-text-button" onClick={()=>setOpen(false)}>Cancel</button><button type="button" className="button-primary" onClick={()=>void save()} disabled={busy}>{busy?"Saving…":active?"Save admin access":"Remove admin access"}</button></div>{message&&<span className="admin-access-message">{message}</span>}</div>}</div>;
}
