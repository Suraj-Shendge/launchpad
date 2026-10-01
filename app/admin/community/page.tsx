import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { MessageSquare, Pin, Lock, TrendingUp } from "lucide-react";

export default async function AdminCommunity(){
  await requireAdmin("community.view"); const db=createAdminClient();
  const [threads,posts,reports]=await Promise.all([
    db.from("community_threads").select("id,title,user_id,is_pinned,is_locked,is_featured,views,reply_count,vote_count,last_activity_at,created_at").order("last_activity_at",{ascending:false}).limit(100),
    db.from("community_posts").select("id",{count:"exact",head:true}),
    db.from("comment_reports").select("id",{count:"exact",head:true}).neq("status","resolved")
  ]);
  const list=threads.data??[];
  return <div className="admin-page">
    <div className="admin-heading"><p className="eyebrow">People / community</p><h1>Community.</h1><p>Moderate discussions, identify high-signal conversations and watch for reports.</p></div>
    <div className="admin-stat-grid admin-stat-grid-detailed admin-stat-grid-4"><div className="admin-kpi"><div className="admin-kpi-top"><span>Threads</span><MessageSquare size={16}/></div><strong>{list.length}</strong><small>latest 100</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Posts</span><MessageSquare size={16}/></div><strong>{posts.count??0}</strong><small>all replies</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Featured</span><TrendingUp size={16}/></div><strong>{list.filter(x=>x.is_featured).length}</strong><small>featured threads</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Open reports</span><Lock size={16}/></div><strong>{reports.count??0}</strong><small>needs review</small></div></div>
    <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Conversation health</p><h2>Recent threads</h2></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Thread</th><th>Engagement</th><th>Controls</th><th>Activity</th></tr></thead><tbody>{list.map(t=><tr key={t.id}><td><strong>{t.title}</strong><small>{t.user_id.slice(0,8)}… · {t.views} views</small></td><td>{t.reply_count} replies · {t.vote_count} votes</td><td><div className="admin-badge-row">{t.is_pinned&&<span><Pin size={11}/> pinned</span>}{t.is_locked&&<span><Lock size={11}/> locked</span>}{t.is_featured&&<span><TrendingUp size={11}/> featured</span>}{!t.is_pinned&&!t.is_locked&&!t.is_featured&&<small>normal</small>}</div></td><td>{new Date(t.last_activity_at||t.created_at).toLocaleDateString("en-IN")}</td></tr>)}</tbody></table>{!list.length&&<div className="admin-empty">No community threads found.</div>}</div></section>
  </div>;
}