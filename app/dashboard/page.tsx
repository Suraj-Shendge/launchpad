import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderKanban, Megaphone, CreditCard, Gavel, Settings } from "lucide-react";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

const links=[["Projects","/dashboard/projects",FolderKanban],["Promotions","/dashboard/promotions",Megaphone],["Auctions","/dashboard/auctions",Gavel],["Payments","/dashboard/payments",CreditCard],["Settings","/dashboard/settings",Settings]] as const;

export default async function Dashboard(){
  if(!hasEnvVars) redirect("/login?next=/dashboard");
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login?next=/dashboard");
  const [projects,promotions,payments,auctions]=await Promise.all([
    supabase.from("projects").select("id",{count:"exact",head:true}).eq("owner_id",user.id),
    supabase.from("promotions").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("status","active"),
    supabase.from("payments").select("id",{count:"exact",head:true}).eq("user_id",user.id),
    supabase.from("auction_bids").select("id",{count:"exact",head:true}).eq("bidder_id",user.id),
  ]);
  const stats=[["Projects",projects.count??0],["Active promotions",promotions.count??0],["Payments",payments.count??0],["Auction activity",auctions.count??0]];
  return <div><Navbar authenticated/><main className="dashboard-shell shell">
    <div className="dashboard-head"><div><p className="eyebrow">Workspace</p><h1>Welcome to your dashboard.</h1><p>{user.email}</p></div><Link href="/submit" className="button-primary">Launch project</Link></div>
    <div className="stat-grid">{stats.map(([label,value])=><div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <div className="dashboard-nav">{links.map(([label,href,Icon])=><Link href={href} key={href}><Icon size={17}/><span>{label}</span></Link>)}</div>
    <div className="dashboard-panel"><p className="eyebrow">Next step</p><h2>Launch something you’re proud of.</h2><p>Once a project is submitted, this workspace becomes the control center for publishing, promotion, auctions and payment history.</p><Link href="/dashboard/projects" className="text-link">Open projects →</Link></div>
  </main><Footer/></div>;
}