import type { MetadataRoute } from "next";
import { getCategories, getPublishedProjects } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=getSiteUrl();
  const supabase=await createClient();
  const [projects,categories,{data:profiles},{data:forums},{data:threads}]=await Promise.all([
    getPublishedProjects({limit:1000}),
    getCategories(),
    supabase.from("profiles").select("username,created_at,is_blocked").eq("is_blocked",false).not("username","is",null).limit(5000),
    supabase.from("community_forums").select("slug,created_at").eq("is_active",true).limit(500),
    supabase.from("community_threads").select("id,updated_at").limit(5000),
  ]);
  return [
    {url:base,lastModified:new Date()},
    {url:base+"/explore",lastModified:new Date()},
    {url:base+"/community",lastModified:new Date()},
    {url:base+"/newsletter",lastModified:new Date()},
    {url:base+"/launch",lastModified:new Date()},
    {url:base+"/pricing",lastModified:new Date()},
    {url:base+"/promote",lastModified:new Date()},
    {url:base+"/auctions",lastModified:new Date()},
    ...categories.map(c=>({url:base+"/categories/"+c.slug})),
    ...projects.map(p=>({url:base+"/projects/"+p.slug,lastModified:p.updated_at?new Date(p.updated_at):undefined})),
    ...(profiles??[]).map(p=>({url:base+"/u/"+p.username,lastModified:p.created_at?new Date(p.created_at):undefined})),
    ...(forums??[]).map(f=>({url:base+"/community/f/"+f.slug,lastModified:f.created_at?new Date(f.created_at):undefined})),
    ...(threads??[]).map(t=>({url:base+"/community/t/"+t.id,lastModified:t.updated_at?new Date(t.updated_at):undefined})),
  ];
}
