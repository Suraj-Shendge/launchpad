import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { EditProjectForm } from "@/components/projecthub/edit-project-form";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { getCategories } from "@/lib/data";

export default async function EditProject({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
  const {data:project}=await supabase.from("projects").select("*").eq("id",id).eq("owner_id",user.id).maybeSingle();
  if(!project) notFound();
  const categories=await getCategories();
  return <div><Navbar authenticated/><main className="section"><div className="dashboard-head"><div><Link href="/dashboard/projects" className="back-link"><ArrowLeft size={14}/>Projects</Link><p className="eyebrow">Edit project</p><h1>{project.name}</h1></div></div><EditProjectForm project={project} categoryOptions={categories}/></main><Footer/></div>;
}