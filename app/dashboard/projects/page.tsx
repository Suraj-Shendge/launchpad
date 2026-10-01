import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function DashboardProjects(){
  if(!hasEnvVars) redirect("/login");
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
  const {data:projects}=await supabase.from("projects").select("id,name,slug,tagline,status,created_at,published_at").eq("owner_id",user.id).order("created_at",{ascending:false});
  return <div><Navbar authenticated/><main className="dashboard-shell shell"><div className="dashboard-head"><div><p className="eyebrow">Workspace</p><h1>Your projects.</h1><p>Create, edit and track your submitted projects.</p></div><Link href="/launch" className="button-primary"><Plus size={16}/> New project</Link></div>
    <div className="list-panel">{projects?.length?projects.map(project=><div className="list-row" key={project.id}><div><strong>{project.name}</strong><span>{project.tagline}</span></div><div className="list-row-right"><span className={"state-chip state-"+project.status}>{project.status==="pending_review"?"Moderation Pending":project.status.replace("_"," ")}</span><Link href={"/dashboard/projects/"+project.id+"/verification"}>Verify</Link><Link href={"/dashboard/projects/"+project.id+"/edit"}>Edit</Link></div></div>):<div className="empty-state"><strong>No projects yet.</strong><span>Start with your first launch.</span><div style={{marginTop:18}}><Link href="/launch" className="button-primary">Create project</Link></div></div>}</div>
  </main><Footer/></div>;
}