import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { History, ShieldCheck } from "lucide-react";

const date=(v:string)=>new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
export default async function AdminAudit(){
  await requireAdmin("audit.view"); const db=createAdminClient();
  const [actions,logs]=await Promise.all([
    db.from("admin_actions").select("id,admin_id,action,target_type,target_id,metadata,created_at").order("created_at",{ascending:false}).limit(200),
    db.from("admin_audit_logs").select("id,admin_user_id,action,target_type,target_id,metadata,created_at").order("created_at",{ascending:false}).limit(200)
  ]);
  const rows=[...(actions.data??[]).map(x=>({...x,source:"admin_actions"})),...(logs.data??[]).map(x=>({id:x.id,admin_id:x.admin_user_id,action:x.action,target_type:x.target_type,target_id:x.target_id,metadata:x.metadata,created_at:x.created_at,source:"audit_logs"}))].sort((a,b)=>+new Date(b.created_at)-+new Date(a.created_at)).slice(0,200);
  return <div className="admin-page">
    <div className="admin-heading"><p className="eyebrow">System / audit</p><h1>Audit log.</h1><p>Every privileged administrative action should leave a trace.</p></div>
    <div className="admin-stat-grid admin-stat-grid-detailed admin-stat-grid-3"><div className="admin-kpi"><div className="admin-kpi-top"><span>Recorded</span><History size={16}/></div><strong>{rows.length}</strong><small>latest 200 events</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Sources</span><ShieldCheck size={16}/></div><strong>2</strong><small>action and audit streams</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Admin</span><ShieldCheck size={16}/></div><strong>1</strong><small>platform owner</small></div></div>
    <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Privileged activity</p><h2>Administrative events</h2></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Action</th><th>Target</th><th>Admin</th><th>Time</th><th>Source</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><strong>{r.action.replaceAll("_"," ")}</strong></td><td>{r.target_type}<small>{r.target_id?.slice(0,12)||"—"}{r.target_id?"…":""}</small></td><td><code>{r.admin_id.slice(0,12)}…</code></td><td>{date(r.created_at)}</td><td><span className="admin-status neutral">{r.source}</span></td></tr>)}</tbody></table>{!rows.length&&<div className="admin-empty">No administrative events recorded yet.</div>}</div></section>
  </div>;
}