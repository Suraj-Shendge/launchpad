import Link from "next/link";
import { ArrowUpRight, Github, Linkedin, Pencil, Globe, Twitter } from "lucide-react";
import { redirect } from "next/navigation";
import { Footer } from "@/components/projecthub/footer";
import { Navbar } from "@/components/projecthub/navbar";
import { ProfileSettingsForm } from "@/components/projecthub/profile-settings-form";
import { ProfileBadge } from "@/components/projecthub/profile-badge";
import { GithubConnectButton } from "@/components/projecthub/github-connect-button";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { getProfileTier } from "@/lib/profile";

function membershipDuration(createdAt:string){
 const start=new Date(createdAt);const now=new Date();
 let years=now.getUTCFullYear()-start.getUTCFullYear(),months=now.getUTCMonth()-start.getUTCMonth(),days=now.getUTCDate()-start.getUTCDate();
 if(days<0){months-=1;days+=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),0)).getUTCDate()}
 if(months<0){years-=1;months+=12}
 if(years>0)return years===1?"1 year":years+" years";
 if(months>0)return months===1?"1 month":months+" months";
 return days<=1?"1 day":days+" days";
}

export default async function ProfilePage(){
 if(!hasEnvVars)redirect("/login");
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login?next=/profile");
 const [{data:profile},{data:projects},{count:publishedCount}]=await Promise.all([
  supabase.from("profiles").select("display_name,username,bio,avatar_url,website_url,twitter_url,linkedin_url,github_url,created_at,verification_tier,github_connected").eq("id",user.id).maybeSingle(),
  supabase.from("projects").select("id,name,slug,tagline,logo_url").eq("owner_id",user.id).eq("status","published").order("published_at",{ascending:false}).limit(6),
  supabase.from("projects").select("id",{count:"exact",head:true}).eq("owner_id",user.id).eq("status","published")
 ]);
 const p=profile??{display_name:"",username:"",bio:"",avatar_url:null,website_url:"",twitter_url:"",linkedin_url:"",github_url:"",created_at:user.created_at,verification_tier:"none",github_connected:false};
 const profileId=p.username||user.email?.split("@")[0]||"member";
 const tier=getProfileTier(publishedCount??0,p.verification_tier,p.github_connected),name=p.display_name||profileId||"ProjectHub member",initials=name.slice(0,1).toUpperCase();
 return <div><Navbar authenticated/><main className="section profile-page">
  <div className="profile-page-head"><div><p className="eyebrow">Profile</p><h1 className="section-title">Your profile.</h1><p className="section-copy">This is how your identity appears across ProjectHub.</p></div><Link href="#edit-profile" className="button-outline"><Pencil size={14}/> Edit profile</Link></div>
  <section className={"profile-preview "+tier.badgeClass}>
   <div className="profile-preview-top"><span className="profile-avatar-preview profile-avatar-preview-large">{p.avatar_url?<img src={p.avatar_url} alt="" />:initials}</span><div className="profile-preview-identity"><h2>{name}<span className={"profile-tier-inline "+tier.badgeClass}><ProfileBadge tier={tier}/><span>{tier.label}</span></span></h2><div className="profile-public-meta"><span>@{profileId}</span><span>Member for {membershipDuration(p.created_at)}</span></div>{p.bio&&<p>{p.bio}</p>}</div></div>
   <div className="profile-links">{p.website_url&&<a href={p.website_url} target="_blank" rel="noreferrer"><Globe size={14}/>Website<ArrowUpRight size={12}/></a>}{p.github_url&&<a href={p.github_url} target="_blank" rel="noreferrer"><Github size={14}/>GitHub<ArrowUpRight size={12}/></a>}{p.linkedin_url&&<a href={p.linkedin_url} target="_blank" rel="noreferrer"><Linkedin size={14}/>LinkedIn<ArrowUpRight size={12}/></a>}{p.twitter_url&&<a href={p.twitter_url} target="_blank" rel="noreferrer"><Twitter size={14}/>X / Twitter<ArrowUpRight size={12}/></a>}</div>
  </section>
  <section className="github-verification-card"><div><p className="eyebrow">Identity verification</p><h2>Verify with GitHub.</h2><p>Connect your GitHub account to earn a verified tick. Admin-assigned roles are verified independently.</p></div><GithubConnectButton connected={p.github_connected}/></section>
  <section className="profile-projects"><div className="profile-section-heading"><div><p className="eyebrow">Published work</p><h2>Your projects</h2></div><Link href="/dashboard/projects">Manage projects →</Link></div>{projects?.length?<div className="profile-project-list">{projects.map(project=><Link href={"/projects/"+project.slug} key={project.id}><span className="profile-project-mark">{project.logo_url?<img src={project.logo_url} alt="" />:project.name.slice(0,1).toUpperCase()}</span><span><strong>{project.name}</strong><small>{project.tagline||"Published project"}</small></span><ArrowUpRight size={14}/></Link>)}</div>:<div className="profile-launch-empty"><Link href="/launch" className="button-primary">Launch project</Link></div>}</section>
  <section id="edit-profile" className="profile-edit-section"><div className="profile-section-heading"><div><p className="eyebrow">Profile controls</p><h2>Edit your public identity</h2></div></div><ProfileSettingsForm profile={p}/></section>
 </main><Footer/></div>;
}
