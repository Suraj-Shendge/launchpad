import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { getAdminAccess } from "@/lib/admin-access";
import { AdminProjectActions } from "@/components/projecthub/admin-project-actions";
import { Archive, CheckCircle2, Clock3, FolderKanban, XCircle } from "lucide-react";

export default async function AdminProjects(){
  await requireAdmin("projects.view"); const {access}=await getAdminAccess(); const db=createAdminClient();
  const {data}=await db.from("projects").select("id,name,slug,status,created_at,updated_at,owner_id,category_id,tagline,rejection_reason,is_verified,published_at,moderated_by").order("created_at",{ascending:false}).limit(200);
  const rows=data??[], ids=rows.map(x=>x.id), owners=[...new Set(rows.map(x=>x.owner_id))];
  const [profiles,views,clicks,verifications]=await Promise.all([
    owners.length?db.from("profiles").select("id,display_name,username,verification_tier").in("id",owners):Promise.resolve({data:[]}),
    ids.length?db.from("project_views").select("project_id").in("project_id",ids):Promise.resolve({data:[]}),
    ids.length?db.from("project_clicks").select("project_id").in("project_id",ids):Promise.resolve({data:[]}),
    ids.length?db.from("project_verifications").select("project_id,overall_status,github_status,website_status,provenance_status,cross_link_status").in("project_id",ids):Promise.resolve({data:[]})
  ]);
  const verificationMap=new Map((verifications.data??[]).map(x=>[x.project_id,x]));
  const ownerMap=new Map((profiles.data??[]).map(x=>[x.id,x]));
  const viewMap=new Map<string,number>(),clickMap=new Map<string,number>();
  for(const x of views.data??[])viewMap.set(x.project_id,(viewMap.get(x.project_id)||0)+1);
  for(const x of clicks.data??[])clickMap.set(x.project_id,(clickMap.get(x.project_id)||0)+1);
  const count=(s:string)=>rows.filter(x=>x.status===s).length;
  const status=(s:string)=>s==="published"?"success":s==="pending_review"?"warning":s==="rejected"?"danger":s==="archived"?"neutral":"neutral";
  return <div className="admin-page">
    <div className="admin-heading"><div><p className="eyebrow">Moderation / projects</p><h1>Projects.</h1><p>Full project inventory with publication state, owner identity, moderation metadata and engagement.</p></div><Link href="/launch" className="text-link">View launch flow →</Link></div>
    <div className="admin-stat-grid admin-stat-grid-detailed admin-stat-grid-5"><div className="admin-kpi"><div className="admin-kpi-top"><span>All</span><FolderKanban size={16}/></div><strong>{rows.length}</strong><small>latest 200</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Pending</span><Clock3 size={16}/></div><strong>{count("pending_review")}</strong><small>awaiting review</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Published</span><CheckCircle2 size={16}/></div><strong>{count("published")}</strong><small>public projects</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Rejected</span><XCircle size={16}/></div><strong>{count("rejected")}</strong><small>needs changes</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Archived</span><Archive size={16}/></div><strong>{count("archived")}</strong><small>not active</small></div></div>
    <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Inventory</p><h2>Project moderation</h2></div></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Project</th><th>Owner</th><th>State</th><th>Engagement</th><th>Ownership</th><th>Moderation</th><th>Action</th></tr></thead><tbody>{rows.map(p=>{const owner=ownerMap.get(p.owner_id);return <tr key={p.id}><td><strong>{p.name}</strong><small>{p.tagline||p.slug}</small></td><td><strong>{owner?.display_name||owner?.username||"Unknown"}</strong><small>{owner?.username?"@"+owner.username:"No username"}</small></td><td><span className={"admin-status "+status(p.status)}>{p.status.replace("_"," ")}</span>{p.is_verified&&<small>Verified project</small>}</td><td><strong>{viewMap.get(p.id)||0}</strong> views<small>{clickMap.get(p.id)||0} clicks</small></td><td>{verificationMap.get(p.id)?<><span className={"admin-status "+(verificationMap.get(p.id)?.overall_status==="verified"?"success":verificationMap.get(p.id)?.overall_status==="review_required"?"danger":"warning")}>{verificationMap.get(p.id)?.overall_status?.replaceAll("_"," ")}</span><small>GH {verificationMap.get(p.id)?.github_status} · Web {verificationMap.get(p.id)?.website_status}</small><small>{verificationMap.get(p.id)?.provenance_status==="fork"?"Fork detected":verificationMap.get(p.id)?.cross_link_status==="verified"?"Cross-link matched":"Checks pending"}</small></>:<span className="admin-status warning">not checked</span>}</td><td><small>Created {new Date(p.created_at).toLocaleDateString("en-IN")}</small><small>{p.moderated_by?"Moderated":"Not moderated"}</small></td><td><AdminProjectActions id={p.id} status={p.status} canApprove={access.permissions.includes("projects.approve")||access.isSuperAdmin} canPublish={access.permissions.includes("projects.publish")||access.isSuperAdmin}/></td></tr>})}</tbody></table>{!rows.length&&<div className="admin-empty">No projects found.</div>}</div>
    </section>
  </div>;
}