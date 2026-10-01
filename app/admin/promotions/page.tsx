import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { BarChart3, Clock3, IndianRupee, Megaphone } from "lucide-react";

const money=(n:number)=>`₹${Number(n||0).toLocaleString("en-IN")}`;
export default async function AdminPromotions(){
  await requireAdmin("promotions.view"); const db=createAdminClient();
  const {data}=await db.from("promotions").select("id,project_id,type,amount,currency,status,starts_at,ends_at,reservation_expires_at,created_at,user_id,duration_days,homepage_slot,metadata").order("created_at",{ascending:false}).limit(200);
  const rows=data??[], revenue=rows.filter(x=>x.status==="active"||x.status==="expired").reduce((s,x)=>s+Number(x.amount||0),0);
  const active=rows.filter(x=>x.status==="active"),pending=rows.filter(x=>x.status==="pending"||x.status==="reserved");
  const projectIds=[...new Set(rows.map(x=>x.project_id))];
  const {data:projects}=projectIds.length?await db.from("projects").select("id,name,slug").in("id",projectIds):{data:[]};
  const names=new Map((projects??[]).map(x=>[x.id,x.name]));
  return <div className="admin-page">
    <div className="admin-heading"><p className="eyebrow">Monetization / promotions</p><h1>Promotions.</h1><p>Control paid visibility, placement windows, reservations and promotion revenue.</p></div>
    <div className="admin-stat-grid admin-stat-grid-detailed admin-stat-grid-4"><div className="admin-kpi"><div className="admin-kpi-top"><span>Active</span><Megaphone size={16}/></div><strong>{active.length}</strong><small>live placements</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Pending</span><Clock3 size={16}/></div><strong>{pending.length}</strong><small>awaiting activation</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Recorded value</span><IndianRupee size={16}/></div><strong>{money(revenue)}</strong><small>active + expired records</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Avg. duration</span><BarChart3 size={16}/></div><strong>{rows.length?Math.round(rows.reduce((s,x)=>s+Number(x.duration_days||0),0)/rows.length):0}d</strong><small>across latest 200</small></div></div>
    <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Placement inventory</p><h2>Promotion ledger</h2></div></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Project</th><th>Type / slot</th><th>Amount</th><th>Window</th><th>Status</th><th>Owner</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><strong>{names.get(p.project_id)||p.project_id.slice(0,8)+"…"}</strong><small>{p.project_id}</small></td><td><strong>{p.type||"promotion"}</strong><small>{p.homepage_slot?"Homepage slot "+p.homepage_slot:p.duration_days+" days"}</small></td><td><strong>{money(p.amount)}</strong><small>{p.currency||"INR"}</small></td><td><small>{p.starts_at?new Date(p.starts_at).toLocaleString("en-IN"):"Not started"}</small><small>{p.ends_at?"Ends "+new Date(p.ends_at).toLocaleString("en-IN"):"No end time"}</small></td><td><span className={"admin-status "+(p.status==="active"?"success":p.status==="expired"?"neutral":"warning")}>{p.status}</span></td><td><code>{p.user_id.slice(0,10)}…</code></td></tr>)}</tbody></table>{!rows.length&&<div className="admin-empty">No promotions found.</div>}</div>
    </section>
  </div>;
}