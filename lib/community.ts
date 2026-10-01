import { createClient } from "@/lib/supabase/server";
import { getProfileTier, type ProfileTier } from "@/lib/profile";

export type CommunityAuthor={id:string;display_name:string|null;username:string|null;name:string|null;avatar_url:string|null;tier?:ProfileTier};
export type CommunityForum={id:string;slug:string;name:string;description:string;icon:string|null;kind:string;sort_order:number};
export type CommunityThread={id:string;forum_id:string;user_id:string;title:string;content:string;slug:string|null;is_pinned:boolean;is_locked:boolean;is_featured:boolean;views:number;reply_count:number;vote_count:number;last_activity_at:string;created_at:string;updated_at:string;forum?:CommunityForum|null;author?:CommunityAuthor|null;viewer_voted?:boolean};
export type CommunityPost={id:string;thread_id:string;user_id:string;parent_id:string|null;content:string;created_at:string;updated_at:string;author?:CommunityAuthor|null};

function cleanSearch(value:string){return value.replace(/[%,]/g," ").replace(/\s+/g," ").trim().slice(0,80)}
async function getClient(){if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return null;return createClient()}

export async function getCommunityForums(){
 const supabase=await getClient();if(!supabase)return [] as CommunityForum[];
 const {data}=await supabase.from("community_forums").select("id,slug,name,description,icon,kind,sort_order").eq("is_active",true).order("sort_order");
 return(data??[]) as CommunityForum[];
}

async function attachThreadMeta(threads:CommunityThread[],forums:CommunityForum[]){
 const supabase=await getClient();if(!supabase||!threads.length)return threads;
 const ids=[...new Set(threads.map(t=>t.user_id))];
 const {data:profiles}=await supabase.from("profiles").select("id,display_name,username,name,avatar_url,verification_tier,github_connected").in("id",ids);
 const counts=new Map<string,number>();
 const {data:projects}=await supabase.from("projects").select("owner_id").in("owner_id",ids).eq("status","published");
 for(const p of projects??[])counts.set(p.owner_id,(counts.get(p.owner_id)??0)+1);
 const profileMap=new Map((profiles??[]).map(p=>[p.id,{...p,tier:getProfileTier(counts.get(p.id)??0,p.verification_tier,p.github_connected)} as CommunityAuthor]));
 const forumMap=new Map(forums.map(f=>[f.id,f]));
 return threads.map(thread=>({...thread,forum:forumMap.get(thread.forum_id)??null,author:profileMap.get(thread.user_id)??null}));
}

export async function getCommunityThreads(options?:{forumSlug?:string;search?:string;sort?:"trending"|"popular"|"new";limit?:number}){
 const supabase=await getClient();if(!supabase)return [] as CommunityThread[];
 const forums=await getCommunityForums();const selectedForum=options?.forumSlug?forums.find(f=>f.slug===options.forumSlug):null;
 if(options?.forumSlug&&!selectedForum)return [];
 let query=supabase.from("community_threads").select("id,forum_id,user_id,title,content,slug,is_pinned,is_locked,is_featured,views,reply_count,vote_count,last_activity_at,created_at,updated_at").limit(options?.limit??40);
 if(selectedForum)query=query.eq("forum_id",selectedForum.id);
 const search=cleanSearch(options?.search??"");if(search)query=query.or("title.ilike.%"+search+"%,content.ilike.%"+search+"%");
 const sort=options?.sort??"trending";
 if(sort==="new")query=query.order("is_pinned",{ascending:false}).order("created_at",{ascending:false});
 else if(sort==="popular")query=query.order("is_pinned",{ascending:false}).order("vote_count",{ascending:false}).order("reply_count",{ascending:false}).order("last_activity_at",{ascending:false});
 else query=query.order("is_pinned",{ascending:false}).order("last_activity_at",{ascending:false}).order("vote_count",{ascending:false});
 const {data}=await query;const items=(data??[]) as CommunityThread[];
 const {data:{user}}=await supabase.auth.getUser();
 if(user&&items.length){const {data:votes}=await supabase.from("community_thread_votes").select("thread_id").eq("user_id",user.id).in("thread_id",items.map(i=>i.id));const voted=new Set((votes??[]).map(v=>v.thread_id));items.forEach(i=>{i.viewer_voted=voted.has(i.id)})}
 return attachThreadMeta(items,forums);
}

export async function getCommunityThread(id:string){
 const supabase=await getClient();if(!supabase)return null;
 const {data:thread}=await supabase.from("community_threads").select("id,forum_id,user_id,title,content,slug,is_pinned,is_locked,is_featured,views,reply_count,vote_count,last_activity_at,created_at,updated_at").eq("id",id).maybeSingle();
 if(!thread)return null;
 const forums=await getCommunityForums();const enriched=(await attachThreadMeta([thread as CommunityThread],forums))[0];
 const {data:posts}=await supabase.from("community_posts").select("id,thread_id,user_id,parent_id,content,created_at,updated_at").eq("thread_id",id).order("created_at",{ascending:true});
 const postItems=(posts??[]) as CommunityPost[];const authorIds=[...new Set(postItems.map(p=>p.user_id))];
 if(authorIds.length){
  const {data:profiles}=await supabase.from("profiles").select("id,display_name,username,name,avatar_url,verification_tier,github_connected").in("id",authorIds);
  const counts=new Map<string,number>();const {data:projects}=await supabase.from("projects").select("owner_id").in("owner_id",authorIds).eq("status","published");for(const p of projects??[])counts.set(p.owner_id,(counts.get(p.owner_id)??0)+1);
  const map=new Map((profiles??[]).map(p=>[p.id,{...p,tier:getProfileTier(counts.get(p.id)??0,p.verification_tier,p.github_connected)} as CommunityAuthor]));postItems.forEach(p=>{p.author=map.get(p.user_id)??null});
 }
 const {data:{user}}=await supabase.auth.getUser();
 if(user){const {data:vote}=await supabase.from("community_thread_votes").select("thread_id").eq("thread_id",id).eq("user_id",user.id).maybeSingle();enriched.viewer_voted=Boolean(vote)}
 await supabase.rpc("increment_community_thread_view",{p_thread_id:id});
 return{thread:enriched,posts:postItems};
}

export async function getCommunityViewer(){const supabase=await getClient();if(!supabase)return null;return(await supabase.auth.getUser()).data.user??null}
