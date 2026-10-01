import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { BarChart3, MousePointerClick, Eye, Globe2 } from "lucide-react";

const since=new Date(Date.now()-30*86400000).toISOString();
const day=(v:string)=>new Date(v).toLocaleDateString("en-IN",{day:"2-digit",month:"short"});
export default async function AdminAnalytics(){
  await requireAdmin("analytics.view"); const db=createAdminClient();
  const [visits,views,clicks,projects]=await Promise.all([
    db.from("site_visits").select("created_at,path,referrer,visitor_id").gte("created_at",since).order("created_at",{ascending:false}).limit(5000),
    db.from("project_views").select("created_at,project_id").gte("created_at",since).order("created_at",{ascending:false}).limit(5000),
    db.from("project_clicks").select("created_at,project_id,destination").gte("created_at",since).order("created_at",{ascending:false}).limit(5000),
    db.from("projects").select("id,name,status,created_at").order("created_at",{ascending:false}).limit(100)
  ]);
  const v=visits.data??[], w=views.data??[], c=clicks.data??[];
  const uniqueVisitors=new Set(v.map(x=>x.visitor_id).filter(Boolean)).size;
  const topPaths=new Map<string,number>(); for(const x of v) topPaths.set(x.path,(topPaths.get(x.path)||0)+1);
  const topProjects=new Map<string,number>(); for(const x of w) topProjects.set(x.project_id,(topProjects.get(x.project_id)||0)+1);
  const projectNames=new Map((projects.data??[]).map(x=>[x.id,x.name]));
  const topPathRows=[...topPaths.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
  const topProjectRows=[...topProjects.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8);
  return <div className="admin-page">
    <div className="admin-heading"><p className="eyebrow">Insights / analytics</p><h1>Analytics.</h1><p>Discovery, traffic and project engagement across the last 30 days.</p></div>
    <div className="admin-stat-grid admin-stat-grid-detailed"><div className="admin-kpi"><div className="admin-kpi-top"><span>Visits</span><Globe2 size={16}/></div><strong>{v.length}</strong><small>{uniqueVisitors} unique visitors</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Project views</span><Eye size={16}/></div><strong>{w.length}</strong><small>30 day discovery</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Project clicks</span><MousePointerClick size={16}/></div><strong>{c.length}</strong><small>outbound interactions</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Click / view</span><BarChart3 size={16}/></div><strong>{w.length?Math.round(c.length/w.length*100):0}%</strong><small>simple engagement rate</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Projects</span><BarChart3 size={16}/></div><strong>{projects.data?.length??0}</strong><small>latest 100</small></div></div>
    <div className="admin-overview-grid">
      <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Traffic</p><h2>Top paths</h2></div></div><div className="admin-ranking">{topPathRows.map(([path,count],i)=><div key={path}><span><b>{i+1}</b>{path}</span><strong>{count}</strong></div>)}{!topPathRows.length&&<div className="admin-empty">No traffic recorded in the last 30 days.</div>}</div></section>
      <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Discovery</p><h2>Most viewed projects</h2></div></div><div className="admin-ranking">{topProjectRows.map(([id,count],i)=><div key={id}><span><b>{i+1}</b>{projectNames.get(id)||id.slice(0,8)+"…"}</span><strong>{count}</strong></div>)}{!topProjectRows.length&&<div className="admin-empty">No project views recorded.</div>}</div></section>
    </div>
    <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Latest traffic</p><h2>Visitor activity</h2></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Time</th><th>Path</th><th>Referrer</th><th>Visitor</th></tr></thead><tbody>{v.slice(0,40).map((x,i)=><tr key={i}><td>{day(x.created_at)}</td><td><strong>{x.path}</strong></td><td>{x.referrer||"Direct"}</td><td><code>{x.visitor_id?.slice(0,12)||"anonymous"}…</code></td></tr>)}</tbody></table></div></section>
  </div>;
}