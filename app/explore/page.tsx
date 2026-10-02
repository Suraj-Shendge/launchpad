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
  return <div><Navbar/><main className="section" style={{paddingTop:50}}>
    <div style={{maxWidth:780,marginBottom:40}}>
      <p className="eyebrow">Discovery</p>
      <h1 className="section-title" style={{fontSize:"clamp(42px,5vw,64px)"}}>Explore projects.</h1>
      <p className="section-copy">Search by name, description, category or tags and discover what makers are shipping.</p>
    </div>
    {featured.length>0&&<section className="explore-featured" aria-labelledby="explore-featured-title">
      <div className="explore-featured-head"><div><p className="eyebrow">Featured</p><h2 id="explore-featured-title">Featured projects.</h2></div><span>{featured.length}/5 spots</span></div>
      <div className="explore-featured-grid">{featured.map(project=><ProjectCard key={project.id} project={project}/>)}</div>
    </section>}
    <form className="search-bar" action="/explore">
      <Search size={17}/><input name="q" defaultValue={q} placeholder="Search projects, tools, ideas..." aria-label="Search projects"/>
      {category && <input type="hidden" name="category" value={category}/>}<button type="submit">Search</button>
    </form>
    <div className="filter-row"><SlidersHorizontal size={16}/>
      <Link className={!category?"filter-active":"filter-option"} href={q?"/explore?q="+encodeURIComponent(q):"/explore"}>All</Link>
      {categories.map(c=><Link key={c.id} className={category===c.slug?"filter-active":"filter-option"} href={"/explore?"+new URLSearchParams(q?{q,category:c.slug}:{category:c.slug}).toString()}>{c.name}</Link>)}      {q && <Link className="filter-clear" href="/explore"><X size={14}/>Clear</Link>}
    </div>
    {projects.length ? <div className="project-grid">{projects.map(project=><ProjectCard key={project.id} project={project}/>)}</div> : <div className="empty-state"><strong>{q || category ? "No projects match those filters." : "No published projects yet."}</strong><span>{q || category ? "Try another search or clear your filters." : "Launch the first public project on ProjectHub."}</span></div>}
  </main><Footer/></div>;
}