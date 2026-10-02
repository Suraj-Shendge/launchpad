import { createClient } from "@/lib/supabase/server";
import type { Category, Project, ProjectRow, Auction } from "@/lib/types";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
async function client() { return configured ? createClient() : null; }

function mapProject(row:ProjectRow):Project {
  return {
    ...row,
    preview_images:Array.isArray(row.preview_images)?row.preview_images:[],
    category: row.category_id ? {id:row.category_id,name:row.category_name,slug:row.category_slug,description:null} : null,
  };
}

async function attachProjectEngagement(supabase:Awaited<ReturnType<typeof createClient>>,projects:Project[]):Promise<Project[]>{
  if(!projects.length)return projects;
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return projects.map(project=>({...project,viewer_upvoted:false}));
  const {data:votes}=await supabase.from("project_votes").select("project_id").eq("user_id",user.id).in("project_id",projects.map(project=>project.id));
  const voted=new Set((votes??[]).map(v=>v.project_id));
  return projects.map(project=>({...project,viewer_upvoted:voted.has(project.id)}));
}

export async function getCategories():Promise<Category[]> {
  const supabase=await client(); if(!supabase) return [];
  const {data}=await supabase.from("categories").select("id,name,slug,description").order("name");
  return (data??[]) as Category[];
}
export async function getPublishedProjects(opts?:{search?:string;category?:string;creatorId?:string;limit?:number}):Promise<Project[]> {
  const supabase=await client(); if(!supabase) return [];
  let q=supabase.from("project_directory").select("*").eq("status","published");
  const search=opts?.search?.replace(/[^a-zA-Z0-9_+@#\- ]/g," ").trim().slice(0,80) || "";
  if(opts?.category) q=q.eq("category_slug",opts.category);
  if(opts?.creatorId) q=q.eq("creator_id",opts.creatorId);
  if(search){
    const {data:matchingTags}=await supabase.from("tags").select("id").ilike("name","%"+search+"%");
    const tagIds=(matchingTags??[]).map(tag=>tag.id);
    let tagProjectIds:string[]=[];
    if(tagIds.length){
      const {data:tagRows}=await supabase.from("project_tags").select("project_id").in("tag_id",tagIds);
      tagProjectIds=[...new Set((tagRows??[]).map(row=>row.project_id))];
    }
    const clauses=[
      "name.ilike.%"+search+"%",
      "tagline.ilike.%"+search+"%",
      "description.ilike.%"+search+"%",
      "category_name.ilike.%"+search+"%",
    ];
    if(tagProjectIds.length)clauses.push("id.in.("+tagProjectIds.join(",")+")");
    q=q.or(clauses.join(","));
  }
  const {data}=await q.order("published_at",{ascending:false}).limit(opts?.limit??24);
  return attachProjectEngagement(supabase,(data??[]).map(r=>mapProject(r as ProjectRow)));
}

export async function getExploreFeaturedProjects():Promise<Project[]> {
  const supabase=await client(); if(!supabase) return [];
  const {data:ids,error}=await supabase.rpc("get_explore_featured_project_ids",{p_limit:5});
  if(error||!ids?.length) return [];
  const projectIds=(ids as Array<{project_id:string}>).map(row=>row.project_id);
  const {data}=await supabase.from("project_directory").select("*").in("id",projectIds).eq("status","published");
  const lookup=new Map((data??[]).map(row=>[row.id,mapProject(row as ProjectRow)]));
  return attachProjectEngagement(supabase,projectIds.map(id=>lookup.get(id)).filter(Boolean) as Project[]);
}

export async function getTodayLaunches():Promise<Project[]> {
  const supabase=await client(); if(!supabase) return [];
  const start=new Date(); start.setUTCHours(0,0,0,0);
  const {data}=await supabase.from("project_directory").select("*").eq("status","published")
    .gte("published_at",start.toISOString()).order("published_at",{ascending:false}).limit(6);
  return attachProjectEngagement(supabase,(data??[]).map(r=>mapProject(r as ProjectRow)));
}

export async function getTrendingProjects():Promise<Project[]> {
  const supabase=await client(); if(!supabase) return [];
  const {data:ranking,error}=await supabase.rpc("get_trending_project_ids",{p_limit:6});
  if(error || !ranking?.length) return getPublishedProjects({limit:6});
  const ids:string[]=(ranking as Array<{project_id:string}>).map(item=>item.project_id);
  const {data}=await supabase.from("project_directory").select("*").in("id",ids);
  const lookup=new Map((data??[]).map(row=>[row.id,mapProject(row as ProjectRow)]));
  return attachProjectEngagement(supabase,ids.map(id=>lookup.get(id)).filter(Boolean) as Project[]);
}
const MAX_HOMEPAGE_PROMOTIONS=10;

export async function getHomepageAuctionWinners():Promise<Array<Project & {winningBid:number|null;auctionEndsAt:string|null}>> {
  const supabase=await client(); if(!supabase) return [];
  const {data:positions}=await supabase.from("promotion_positions").select("id").in("slug",["homepage-hero","homepage-featured"]);
  const positionIds=(positions??[]).map(item=>item.id);
  if(!positionIds.length) return [];
  const {data:winners}=await supabase.from("homepage_auction_winners").select("project_id,winning_bid,promotion_ends_at,auction_ends_at").limit(MAX_HOMEPAGE_PROMOTIONS);
  const ids=(winners??[]).map(row=>row.project_id);
  if(!ids.length)return [];
  const {data:projects}=await supabase.from("project_directory").select("*").eq("status","published").in("id",ids);
  const lookup=new Map((projects??[]).map(row=>[row.id,mapProject(row as ProjectRow)]));
  return (winners??[]).map(row=>{
    const project=lookup.get(row.project_id);
    return project?{...project,winningBid:Number(row.winning_bid??0)||null,auctionEndsAt:row.promotion_ends_at}:null;
  }).filter(Boolean) as Array<Project & {winningBid:number|null;auctionEndsAt:string|null}>;
}

export async function getProjectBySlug(slug:string):Promise<Project|null> {
  const supabase=await client(); if(!supabase) return null;
  const {data}=await supabase.from("project_directory").select("*").eq("slug",slug).maybeSingle();
  if(!data) return null;
  const project=mapProject(data as ProjectRow);
  const {data:assets}=await supabase.from("projects").select("preview_images,github_url").eq("id",project.id).maybeSingle();
  const enriched={...project,github_url:assets?.github_url??null,preview_images:Array.isArray(assets?.preview_images)?assets.preview_images:[]};
  return (await attachProjectEngagement(supabase,[enriched]))[0]??enriched;
}

export async function getActiveAuctions():Promise<Auction[]> {
  const supabase=await client(); if(!supabase) return [];
  const {data}=await supabase.from("homepage_auction_public").select("id,starting_price,current_bid,bid_increment,starts_at,ends_at,status,current_bid_project_id");
  return (data??[]).map(row=>({...row,project_id:null,placement:"Homepage Auction",current_bid_project_id:row.current_bid_project_id??null,winning_project_id:null,homepage_slot:null,winner_id:null})) as Auction[];
}
