import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { Activity, ArrowUpRight, CircleAlert, Eye, FolderKanban, Gavel, IndianRupee, MessageSquare, ShieldCheck, Users } from "lucide-react";

const money=(n:number)=>`₹${Number(n||0).toLocaleString("en-IN")}`;
const date=(v:string|null)=>v?new Date(v).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"—";

export default async function Admin(){
  await requireAdmin("overview.view");
  const db=createAdminClient();
  const since=new Date(Date.now()-30*86400000).toISOString();
  const [users,projects,published,pending,views,clicks,payments,revenue,promos,auctions,bids,threads,reports,visits,activity]=await Promise.all([
    db.from("profiles").select("id",{count:"exact",head:true}),
    db.from("projects").select("id",{count:"exact",head:true}),
    db.from("projects").select("id",{count:"exact",head:true}).eq("status","published"),
    db.from("projects").select("id,name,slug,created_at,owner_id").eq("status","pending_review").order("created_at",{ascending:false}).limit(8),
    db.from("project_views").select("id",{count:"exact",head:true}).gte("created_at",since),
    db.from("project_clicks").select("id",{count:"exact",head:true}).gte("created_at",since),
    db.from("payments").select("id",{count:"exact",head:true}).gte("created_at",since),
    db.from("payments").select("amount").eq("status","paid").gte("created_at",since),
    db.from("promotions").select("id",{count:"exact",head:true}).eq("status","active"),
    db.from("auctions").select("id",{count:"exact",head:true}).eq("status","active"),
    db.from("auction_bids").select("id",{count:"exact",head:true}).gte("created_at",since),
    db.from("community_threads").select("id",{count:"exact",head:true}).gte("created_at",since),
    db.from("comment_reports").select("id",{count:"exact",head:true}).neq("status","resolved"),
    db.from("site_visits").select("id",{count:"exact",head:true}).gte("created_at",since),
    db.from("admin_actions").select("id,action,target_type,created_at,metadata").order("created_at",{ascending:false}).limit(10)
  ]);
  const revenue30=(revenue.data??[]).reduce((s,p)=>s+Number(p.amount||0),0);
  const stats=[
    {label:"Users",value:users.count??0,meta:"registered accounts",icon:Users},
    {label:"Published",value:published.count??0,meta:`${projects.count??0} total projects`,icon:FolderKanban},
    {label:"30d views",value:views.count??0,meta:"project discovery",icon:Eye},
    {label:"30d revenue",value:money(revenue30),meta:`${payments.count??0} payment records`,icon:IndianRupee},
    {label:"Live auctions",value:auctions.count??0,meta:`${bids.count??0} bids in 30d`,icon:Gavel},
  ];
  return <div className="admin-page">
    <div className="admin-heading admin-heading-wide"><div><p className="eyebrow">Control room / overview</p><h1>Platform intelligence.</h1><p>Operational view of ProjectHub across discovery, moderation, community and monetization.</p></div><span className="admin-live-dot"><i/> Live data</span></div>
    <div className="admin-stat-grid admin-stat-grid-detailed">{stats.map(s=>{const Icon=s.icon;return <div className="admin-kpi" key={s.label}><div className="admin-kpi-top"><span>{s.label}</span><Icon size={16}/></div><strong>{s.value}</strong><small>{s.meta}</small></div>})}</div>
    <div className="admin-overview-grid">
      <section className="admin-card admin-card-large"><div className="admin-section-head"><div><p className="eyebrow">Needs attention</p><h2>Moderation queue</h2></div><Link href="/admin/projects">Open moderation <ArrowUpRight size={14}/></Link></div>
        <div className="admin-rows">{pending.data?.map(p=><div className="admin-row" key={p.id}><div><strong>{p.name}</strong><span>Submitted {date(p.created_at)}</span></div><div><span className="admin-status pending">Pending review</span><Link href="/admin/projects">Review</Link></div></div>)}</div>
        {!pending.data?.length&&<div className="admin-empty"><ShieldCheck size={18}/><span>No projects are waiting for review.</span></div>}
      </section>
      <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">30 day pulse</p><h2>Activity</h2></div><Activity size={17}/></div>
        <div className="admin-metric-list"><div><span>Site visits</span><strong>{visits.count??0}</strong></div><div><span>Project views</span><strong>{views.count??0}</strong></div><div><span>Project clicks</span><strong>{clicks.count??0}</strong></div><div><span>Community threads</span><strong>{threads.count??0}</strong></div><div><span>Open reports</span><strong>{reports.count??0}</strong></div></div>
      </section>
    </div>
    <div className="admin-overview-grid">
      <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Commercial</p><h2>Revenue engine</h2></div><Link href="/admin/payments">Payments <ArrowUpRight size={14}/></Link></div>
        <div className="admin-detail-grid"><div><small>Paid in 30d</small><strong>{money(revenue30)}</strong></div><div><small>Active promotions</small><strong>{promos.count??0}</strong></div><div><small>Live auctions</small><strong>{auctions.count??0}</strong></div><div><small>Bid activity</small><strong>{bids.count??0}</strong></div></div>
      </section>
      <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Audit</p><h2>Recent admin actions</h2></div><Link href="/admin/audit">View log <ArrowUpRight size={14}/></Link></div>
        <div className="admin-rows">{activity.data?.slice(0,5).map(a=><div className="admin-row compact" key={a.id}><div><strong>{a.action.replaceAll("_"," ")}</strong><span>{a.target_type} · {date(a.created_at)}</span></div></div>)}</div>
      </section>
    </div>
    <section className="admin-card admin-quick"><div className="admin-section-head"><div><p className="eyebrow">Operations</p><h2>Quick access</h2></div></div><div className="admin-quick-grid">{[["Projects","/admin/projects","Moderate submissions and manage publication."],["Users","/admin/users","Verification, access and account controls."],["Reports","/admin/reports","Review community and comment reports."],["Analytics","/admin/analytics","Traffic, discovery and conversion signals."],["Auctions","/admin/auctions","Slots, bids, winners and settlement."],["Settings","/admin/settings","Pricing and platform configuration."]].map(([name,href,desc])=><Link href={href} key={href}><strong>{name}<ArrowUpRight size={14}/></strong><span>{desc}</span></Link>)}</div></section>
  </div>;
}