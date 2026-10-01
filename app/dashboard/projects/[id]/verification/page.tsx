import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { ProjectVerificationPanel } from "@/components/projecthub/project-verification-panel";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ProjectVerificationPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login");
  const db=createAdminClient();
  const {data:project}=await db.from("projects").select("id,name,owner_id,website_url,github_url").eq("id",id).maybeSingle();
  if(!project||project.owner_id!==user.id) redirect("/dashboard/projects");
  let {data:verification}=await db.from("project_verifications").select("*").eq("project_id",id).maybeSingle();
  if(!verification){
    const token="phv_"+crypto.randomUUID().replace(/-/g,"");
    verification=(await db.from("project_verifications").insert({project_id:id,github_url:project.github_url,website_url:project.website_url,verification_token:token}).select("*").single()).data;
  }
  if(!verification) redirect("/dashboard/projects");
  return <div><Navbar authenticated/><main className="dashboard-shell shell verification-page">
    <Link href="/dashboard/projects" className="back-link"><ArrowLeft size={14}/>Back to projects</Link>
    <div className="dashboard-head"><div><p className="eyebrow">Ownership verification</p><h1>{project.name}.</h1><p>Verify control of the GitHub repository and website without waiting for manual contact.</p></div></div>
    <ProjectVerificationPanel projectId={id} initial={verification}/>
  </main><Footer/></div>;
}
