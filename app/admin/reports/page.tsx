import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { Flag, ShieldAlert } from "lucide-react";

const date=(v:string)=>new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
export default async function AdminReports(){
  await requireAdmin("reports.view"); const db=createAdminClient();
  const {data}=await db.from("comment_reports").select("id,comment_id,reporter_id,reason,description,status,created_at,resolved_at,resolved_by").order("created_at",{ascending:false}).limit(200);
  const open=(data??[]).filter(r=>r.status!=="resolved");
  return <div className="admin-page">
    <div className="admin-heading"><p className="eyebrow">Moderation / reports</p><h1>Reports.</h1><p>Review user-submitted reports and keep community conversations healthy.</p></div>
    <div className="admin-stat-grid admin-stat-grid-detailed admin-stat-grid-3"><div className="admin-kpi"><div className="admin-kpi-top"><span>Open</span><Flag size={16}/></div><strong>{open.length}</strong><small>requires review</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Total</span><ShieldAlert size={16}/></div><strong>{data?.length??0}</strong><small>latest 200 records</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Resolved</span><Flag size={16}/></div><strong>{(data??[]).filter(r=>r.status==="resolved").length}</strong><small>closed reports</small></div></div>    <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Case queue</p><h2>Community reports</h2></div><span className="admin-muted">{open.length} open</span></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Reason</th><th>Report</th><th>Status</th><th>Created</th><th>Case</th></tr></thead><tbody>{data?.map(r=><tr key={r.id}><td><strong>{r.reason||"Unspecified"}</strong><small>{r.description||"No additional description"}</small></td><td><code>{r.comment_id.slice(0,8)}…</code><small>Reporter {r.reporter_id.slice(0,8)}…</small></td><td><span className={"admin-status "+(r.status==="resolved"?"success":"warning")}>{r.status}</span></td><td>{date(r.created_at)}</td><td><button className="admin-text-button">Open case</button></td></tr>)}</tbody></table>{!data?.length&&<div className="admin-empty">No reports have been submitted.</div>}</div>
    </section>
  </div>;
}