import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { ProjectCard } from "@/components/projecthub/project-card";
import { getCategories, getPublishedProjects } from "@/lib/data";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params; const categories=await getCategories(); const category=categories.find(c=>c.slug===slug);
 if(!category)return {title:"Category not found",robots:{index:false,follow:false}};
 const description=category.description||("Discover "+category.name+" projects on ProjectHub.");
 return {title:category.name+" projects",description,alternates:{canonical:"/categories/"+category.slug},openGraph:{title:category.name+" projects — ProjectHub",description,type:"website"}};
}

export default async function CategoryPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const categories=await getCategories(); const category=categories.find(c=>c.slug===slug);
 if(!category) notFound(); const projects=await getPublishedProjects({category:slug,limit:48});
 return <div><Navbar/><main className="section category-page">
   <Link href="/explore" className="back-link">← Explore</Link>
   <p className="eyebrow">{category.name}</p><h1 className="section-title" style={{fontSize:"clamp(44px,6vw,72px)"}}>{category.name} projects.</h1>
   <p className="section-copy">{category.description||"Discover projects in this category."}</p>
   <div style={{marginTop:38}}>{projects.length?<div className="project-grid">{projects.map(project=><ProjectCard key={project.id} project={project}/>)}</div>:<div className="empty-state"><strong>No published projects in {category.name} yet.</strong><span>Check back after the next launch.</span></div>}</div>
 </main><Footer/></div>;
}