import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { ProjectCard } from "@/components/projecthub/project-card";
import { getCategories, getExploreFeaturedProjects, getPublishedProjects } from "@/lib/data";

type Params = Promise<{q?:string;category?:string}>;

export const instant = false;

export async function generateMetadata({searchParams}:{searchParams:Params}):Promise<Metadata>{
  const params=await searchParams; const q=params.q?.trim()||""; const category=params.category||"";
  return {title:q?"Search: "+q:category?"Explore "+category:"Explore projects",description:"Discover published products, tools and ideas from ProjectHub makers.",alternates:{canonical:"/explore"},robots:{index:!q&&!category,follow:true},openGraph:{title:"Explore projects — ProjectHub",description:"Discover published products, tools and ideas from ProjectHub makers.",type:"website"}};
}

export default async function Explore({searchParams}:{searchParams:Params}) {
  const params=await searchParams;
  const q=params.q?.trim() || "";
  const category=params.category || "";
  const [projects,categories,featured]=await Promise.all([
    getPublishedProjects({search:q,category,limit:48}),
    getCategories(),
    getExploreFeaturedProjects(),
  ]);
  const featuredIds=new Set(featured.map(project=>project.id));
  const discoveryProjects=!q&&!category?projects.filter(project=>!featuredIds.has(project.id)):projects;
  const featuredSlots=Array.from({length:5},(_,index)=>featured[index]??null);
  return <div><Navbar/><main className="section explore-page">
    <div className="explore-heading">
      <p className="eyebrow">Discovery</p>
      <h1 className="section-title">Explore projects.</h1>
      <p className="section-copy">Search by name, description, category or tags and discover what makers are shipping.</p>
    </div>
    {featured.length>0&&<section className="explore-featured" aria-labelledby="explore-featured-title">
      <div className="explore-featured-head"><div><p className="eyebrow">Featured</p><h2 id="explore-featured-title">Featured projects.</h2></div></div>
      <div className="explore-featured-grid">{featuredSlots.map((project,index)=>project
        ? <ProjectCard key={project.id} project={project}/>
        : <Link className="explore-featured-slot" key={"slot-"+index} href="/dashboard/promotions/new" aria-label="Feature your project on Explore"><strong>Feature Your Project Here</strong><small>Get your project featured above Explore.</small></Link>
      )}</div>
    </section>}
    <form className="search-bar explore-search" action="/explore">
      <Search size={17}/><input name="q" defaultValue={q} placeholder="Search projects, tools, ideas..." aria-label="Search projects"/>
      {category && <input type="hidden" name="category" value={category}/>}<button type="submit">Search</button>
    </form>
    <div className="filter-row"><SlidersHorizontal size={16}/>
      <Link className={!category?"filter-active":"filter-option"} href={q?"/explore?q="+encodeURIComponent(q):"/explore"}>All</Link>
      {categories.map(c=><Link key={c.id} className={category===c.slug?"filter-active":"filter-option"} href={"/explore?"+new URLSearchParams(q?{q,category:c.slug}:{category:c.slug}).toString()}>{c.name}</Link>)}      {q && <Link className="filter-clear" href="/explore"><X size={14}/>Clear</Link>}
    </div>
    {discoveryProjects.length ? <div className="project-grid">{discoveryProjects.map(project=><ProjectCard key={project.id} project={project}/>)}</div> : <div className="empty-state"><strong>{q || category ? "No projects match those filters." : "No published projects yet."}</strong><span>{q || category ? "Try another search or clear your filters." : "Launch the first public project on ProjectHub."}</span></div>}
  </main><Footer/></div>;
}