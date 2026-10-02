import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function Promotions(){
  if(!hasEnvVars) redirect("/login");
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
 const {data:items}=await supabase.from("promotions").select("id,amount,duration_days,starts_at,ends_at,status,project_id,type,homepage_slot,position_id").eq("user_id",user.id).order("created_at",{ascending:false});
 const projectIds=[...new Set((items??[]).map(item=>item.project_id))]; const positionIds=[...new Set((items??[]).map(item=>item.position_id))];
 const [{data:projects},{data:positions}]=await Promise.all([
   projectIds.length?supabase.from("projects").select("id,name,slug").in("id",projectIds):Promise.resolve({data:[]}),
   positionIds.length?supabase.from("promotion_positions").select("id,name,slug").in("id",positionIds):Promise.resolve({data:[]})
 ]);
 const projectMap=new Map((projects??[]).map(project=>[project.id,project])); const positionMap=new Map((positions??[]).map(position=>[position.id,position]));
 const typeLabel=(type:string)=>type==="homepage"?"Homepage auction":type==="featured"?"Featured promotion":type||"Promotion";
 const formatDate=(value:string|null)=>value?new Date(value).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"—";
 return <div><Navbar authenticated/><main className="dashboard-shell shell"><div className="dashboard-head"><div><p className="eyebrow">Promotions</p><h1>Your promotion activity.</h1><p>Track scheduled, active and expired project visibility.</p></div><Link href="/dashboard/promotions/new" className="button-primary">Promote a project</Link></div>
 <div className="list-panel">{items?.length?items.map(item=>{const project=projectMap.get(item.project_id); const position=positionMap.get(item.position_id); return <div className="promotion-history-row" key={item.id}><div className="promotion-history-main"><div className="promotion-history-head"><div className="promotion-history-project"><strong>{project?.name||"Project promotion"}</strong>{project?.slug&&<Link href={"/projects/"+project.slug}>Open project ↗</Link>}</div><div className="list-row-right"><span className="state-chip">{item.status}</span><span>{item.ends_at?formatDate(item.ends_at):"Not scheduled"}</span></div></div><div className="promotion-history-meta"><div><small>Type</small><strong>{typeLabel(item.type)}</strong></div><div><small>Placement</small><strong>{position?.name||"—"}</strong></div>{item.homepage_slot&&<div><small>Homepage slot</small><strong>Slot {item.homepage_slot}</strong></div>}<div><small>Amount</small><strong>₹{Number(item.amount).toLocaleString("en-IN")}</strong></div><div><small>Duration</small><strong>{item.duration_days} days</strong></div><div><small>Starts</small><strong>{formatDate(item.starts_at)}</strong></div><div><small>Ends</small><strong>{formatDate(item.ends_at)}</strong></div></div></div></div>;}):<div className="empty-state"><strong>No promotions yet.</strong><span>Choose featured placement for one of your published projects.</span></div>}</div>
 </main><Footer/></div>;
}