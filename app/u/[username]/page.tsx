import Link from "next/link";
import { ArrowUpRight, Github, Linkedin, Globe, Twitter } from "lucide-react";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { ProfileBadge } from "@/components/projecthub/profile-badge";
import { FollowButton } from "@/components/projecthub/follow-button";
import { ProjectCard } from "@/components/projecthub/project-card";
import { createClient } from "@/lib/supabase/server";
import { getPublishedProjects } from "@/lib/data";
import { getProfileTier } from "@/lib/profile";

type Params=Promise<{username:string}>;

export default async function PublicProfile({params}:{params:Params}){
 const {username}=await params; const supabase=await createClient();
 const {data:profile}=await supabase.from("profiles").select("id,display_name,username,name,bio,avatar_url,website_url,twitter_url,linkedin_url,github_url,created_at,verification_tier,github_connected").eq("username",username).maybeSingle();
 if(!profile)notFound();
 const {data:{user}}=await supabase.auth.getUser();
 const [projects,{count:publishedCount},followers,{data:isFollowing}]=await Promise.all([
   getPublishedProjects({creatorId:profile.id,limit:24}),
   supabase.from("projects").select("id",{count:"exact",head:true}).eq("owner_id",profile.id).eq("status","published"),
   supabase.rpc("get_follow_count",{p_following_type:"user",p_following_id:profile.id}),
   user&&user.id!==profile.id?supabase.rpc("is_following",{p_following_type:"user",p_following_id:profile.id}):Promise.resolve({data:false})
 ]);
 const tier=getProfileTier(publishedCount??0,profile.verification_tier,profile.github_connected);
 const name=profile.display_name||profile.username||profile.name||"ProjectHub member";
 const initials=name.slice(0,1).toUpperCase();
 return <div><Navbar authenticated={Boolean(user)}/><main className="section public-profile-page">
  <section className="public-profile-hero"><div className="public-profile-identity">
   <span className="profile-avatar-preview profile-avatar-preview-large">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:initials}</span>
   <div><p className="eyebrow">ProjectHub profile</p><h1>{name}<span className="profile-tier-inline"><ProfileBadge tier={tier}/></span></h1>
   <div className="public-profile-meta"><span>@{profile.username}</span><span>{publishedCount??0} published {publishedCount===1?"project":"projects"}</span><span>{Number(followers.data??0)} followers</span></div>
   {profile.bio&&<p className="public-profile-bio">{profile.bio}</p>}</div>
  </div>
  {user?.id===profile.id?<Link href="/profile" className="follow-button is-following">Edit profile</Link>:<FollowButton followingType="user" targetId={profile.id} initialFollowing={Boolean(isFollowing)} initialCount={Number(followers.data??0)}/>}
  </section>
  <div className="public-profile-links">{profile.website_url&&<a href={profile.website_url} target="_blank" rel="noreferrer"><Globe size={14}/>Website<ArrowUpRight size={12}/></a>}{profile.github_url&&<a href={profile.github_url} target="_blank" rel="noreferrer"><Github size={14}/>GitHub<ArrowUpRight size={12}/></a>}{profile.linkedin_url&&<a href={profile.linkedin_url} target="_blank" rel="noreferrer"><Linkedin size={14}/>LinkedIn<ArrowUpRight size={12}/></a>}{profile.twitter_url&&<a href={profile.twitter_url} target="_blank" rel="noreferrer"><Twitter size={14}/>X / Twitter<ArrowUpRight size={12}/></a>}</div>
  <section className="profile-projects public-profile-projects"><div className="profile-section-heading"><div><p className="eyebrow">Published work</p><h2>{name}'s projects</h2></div><span>{projects.length} shown</span></div>
  {projects.length?<div className="project-grid">{projects.map(project=><ProjectCard key={project.id} project={project}/>)}</div>:<div className="profile-launch-empty"><span>No published projects yet.</span></div>}
  </section>
 </main><Footer/></div>;
}
