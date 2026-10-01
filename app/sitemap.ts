import type { MetadataRoute } from "next";
import { getCategories, getPublishedProjects } from "@/lib/data";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000";
  const [projects,categories]=await Promise.all([getPublishedProjects({limit:1000}),getCategories()]);
  return [
    {url:base},
    {url:base+"/explore"},
    {url:base+"/launch"},
    {url:base+"/pricing"},
    {url:base+"/promote"},
    {url:base+"/auctions"},
    ...categories.map(c=>({url:base+"/categories/"+c.slug})),
    ...projects.map(p=>({url:base+"/projects/"+p.slug})),
  ];
}
