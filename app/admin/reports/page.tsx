import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminAccess } from "@/lib/admin-access";
import { AdminReportsTable } from "@/components/projecthub/admin-reports-table";
import { Flag, ShieldAlert } from "lucide-react";

export default async function AdminReports(){
  const {access}=await getAdminAccess();
  if(!access.permissions.includes("reports.view")&&!access.isSuperAdmin)return null;
  const db=createAdminClient();
  const {data}=await db.from("comment_reports").select("id,comment_id,reporter_id,reason,description,status,created_at,resolved_at,resolved_by").order("created_at",{ascending:false}).limit(200);
  const reports=data??[];
  const commentIds=reports.map(r=>r.comment_id);
  const reporterIds=reports.map(r=>r.reporter_id);
  const [{data:comments},{data:reporterProfiles}]=await Promise.all([
    db.from("project_comments").select("id,project_id,user_id,content").in("id",commentIds),
    db.from("profiles").select("id,display_name,username").in("id",reporterIds),
  ]);
  const projectIds=(comments??[]).map(c=>c.project_id);
  const authorIds=(comments??[]).map(c=>c.user_id);
  const {data:projects}=await db.from("projects").select("id,slug,name").in("id",projectIds);
  const {data:authors}=await db.from("profiles").select("id,display_name,username").in("id",authorIds);
  const commentMap=new Map((comments??[]).map(c=>[c.id,c]));
  const projectMap=new Map((projects??[]).map(p=>[p.id,p]));
  const profileMap=new Map([...(reporterProfiles??[]),...(authors??[])].map(p=>[p.id,p]));
  const rows=reports.map(r=>{
    const comment=commentMap.get(r.comment_id);
    const project=comment?projectMap.get(comment.project_id):undefined;
    const reporter=profileMap.get(r.reporter_id);
    const author=comment?profileMap.get(comment.user_id):undefined;
    return {...r,projectSlug:project?.slug??null,projectName:project?.name??null,commentPreview:comment?.content??null,
      reporterName:reporter?.display_name||reporter?.username||null,commentAuthorName:author?.display_name||author?.username||null};
  });
  const open=reports.filter(r=>r.status!=="resolved").length;
  return <div className="admin-page">
    <div className="admin-heading"><p className="eyebrow">Moderation / reports</p><h1>Reports.</h1><p>Review user-submitted reports, inspect the reported comment in context, and resolve cases.</p></div>
    <div className="admin-stat-grid admin-stat-grid-detailed admin-stat-grid-3"><div className="admin-kpi"><div className="admin-kpi-top"><span>Open</span><Flag size={16}/></div><strong>{open}</strong><small>requires review</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Total</span><ShieldAlert size={16}/></div><strong>{reports.length}</strong><small>latest 200 records</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Resolved</span><Flag size={16}/></div><strong>{reports.length-open}</strong><small>closed reports</small></div></div>
    <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Case queue</p><h2>Community reports</h2></div><span className="admin-muted">{open} open</span></div>
      {rows.length?<AdminReportsTable reports={rows}/>:<div className="admin-empty">No reports have been submitted.</div>}
    </section>
  </div>;
}
