import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function Promotions(){
  if(!hasEnvVars) redirect("/login");
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
 const {data:items}=await supabase.from("promotions").select("id,amount,duration_days,starts_at,ends_at,status,project_id").eq("user_id",user.id).order("created_at",{ascending:false});
 return <div><Navbar authenticated/><main className="dashboard-shell shell"><div className="dashboard-head"><div><p className="eyebrow">Promotions</p><h1>Your promotion activity.</h1><p>Track scheduled, active and expired project visibility.</p></div><Link href="/dashboard/promotions/new" className="button-primary">Promote a project</Link></div>
 <div className="list-panel">{items?.length?items.map(item=><div className="list-row" key={item.id}><div><strong>Project promotion</strong><span>{item.duration_days} days · ₹{Number(item.amount).toLocaleString("en-IN")}</span></div><div className="list-row-right"><span className="state-chip">{item.status}</span><span>{item.ends_at?new Date(item.ends_at).toLocaleDateString("en-IN"):"Not scheduled"}</span></div></div>):<div className="empty-state"><strong>No promotions yet.</strong><span>Choose featured placement for one of your published projects.</span></div>}</div>
 </main><Footer/></div>;
}