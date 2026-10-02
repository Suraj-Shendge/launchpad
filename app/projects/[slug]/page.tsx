import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { ProjectCard } from "@/components/projecthub/project-card";
import { SectionHeading } from "@/components/projecthub/section-heading";
import { ShareButton } from "@/components/projecthub/share-button";
import { ViewTracker } from "@/components/projecthub/view-tracker";
import { ProfileBadge } from "@/components/projecthub/profile-badge";
import { FollowButton } from "@/components/projecthub/follow-button";
import { ProjectUpvoteButton } from "@/components/projecthub/project-upvote-button";
import { WinnerPayment } from "@/components/projecthub/winner-payment";
import { ProjectComments, type ProjectComment } from "@/components/projecthub/project-comments";
import { getProfileTier } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { getProjectBySlug, getPublishedProjects } from "@/lib/data";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
 const {slug}=await params;const project=await getProjectBySlug(slug);
 if(!project)return {title:"Project not found",robots:{index:false,follow:false}};
 const base=process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000";
 const url=base+"/projects/"+project.slug;
 const image=project.preview_images?.[0]||project.logo_url||base+"/opengraph-image.png";
 return {title:project.name,description:project.tagline,alternates:{canonical:"/projects/"+project.slug},openGraph:{title:project.name+" — ProjectHub",description:project.tagline,url,type:"website",images:[{url:image}]},twitter:{card:"summary_large_image",title:project.name+" — ProjectHub",description:project.tagline,images:[image]}};
}

export default async function ProjectPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const project=await getProjectBySlug(slug);if(!project||project.status!=="published")notFound();
 const related=await getPublishedProjects({category:project.category?.slug,limit:4});
 const publicUrl=(process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000")+"/projects/"+project.slug;
 const supabase=await createClient();
 const [{data:creatorProfile},{count:creatorProjectCount}]=project.creator_id?await Promise.all([
  supabase.from("profiles").select("display_name,username,avatar_url,verification_tier,github_connected").eq("id",project.creator_id).maybeSingle(),
  supabase.from("projects").select("id",{count:"exact",head:true}).eq("owner_id",project.creator_id).eq("status","published")
 ]):[{data:null},{count:0}];
 const creatorTier=project.creator_id?getProfileTier(creatorProjectCount??0,creatorProfile?.verification_tier,creatorProfile?.github_connected):null;
 const creatorName=creatorProfile?.display_name||creatorProfile?.username||project.creator_name;
 const {data:{user:viewer}}=await supabase.auth.getUser();
 const auctionPayment=viewer?((await supabase.from("payments").select("id,auction_id,amount,razorpay_order_id,payment_deadline_at").eq("user_id",viewer.id).eq("project_id",project.id).eq("status","pending").not("auction_id","is",null).gt("payment_deadline_at",new Date().toISOString()).order("payment_deadline_at",{ascending:true}).limit(1).maybeSingle()).data):null;
 const {data:commentRows}=await supabase.from("project_comments").select("id,project_id,user_id,parent_id,content,created_at,updated_at,is_founder_reply,like_count").eq("project_id",project.id).is("deleted_at",null).order("created_at",{ascending:true});
 const commentUserIds=[...new Set((commentRows??[]).map(comment=>comment.user_id))];
 const commentIds=(commentRows??[]).map(comment=>comment.id);
 const {data:commentProfiles}=commentUserIds.length?await supabase.from("profiles").select("id,username,display_name,avatar_url,verification_tier").in("id",commentUserIds):{data:[]};
 const {data:viewerLikes}=viewer&&commentIds.length?await supabase.from("comment_likes").select("comment_id").eq("user_id",viewer.id).in("comment_id",commentIds):{data:[]};
 const likedCommentIds=new Set((viewerLikes??[]).map(like=>like.comment_id));
 const commentProfileMap=new Map((commentProfiles??[]).map(profile=>[profile.id,profile]));
 const initialComments=(commentRows??[]).map(comment=>({...comment,user_liked:likedCommentIds.has(comment.id),profile:commentProfileMap.get(comment.user_id)??null})) as ProjectComment[];
 const viewerProfile=viewer?.id?(commentProfileMap.get(viewer.id)??(await supabase.from("profiles").select("id,username,display_name,avatar_url,verification_tier").eq("id",viewer.id).maybeSingle()).data):null;
 const [creatorFollowers,creatorFollowing]=project.creator_id?await Promise.all([
  supabase.rpc("get_follow_count",{p_following_type:"user",p_following_id:project.creator_id}),
  viewer&&viewer.id!==project.creator_id?supabase.rpc("is_following",{p_following_type:"user",p_following_id:project.creator_id}):Promise.resolve({data:false})
 ]):[{data:0},{data:false}];
 const structuredData=JSON.stringify({"@context":"https://schema.org","@type":"SoftwareApplication",name:project.name,description:project.tagline,url:publicUrl,image:project.preview_images?.[0]||project.logo_url||undefined,applicationCategory:project.category?.name||"Software",author:creatorName?{"@type":"Person",name:creatorName}:undefined}).replace(/</g,"\\u003c");
 return <div><Navbar/><main><ViewTracker projectId={project.id}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:structuredData}}/>
  <section className="project-hero section"><div className="project-detail-intro"><div className="project-detail-mark">{project.logo_url?<img src={project.logo_url} alt="" className="detail-logo"/>:<span>{project.name.slice(0,1)}</span>}</div>
   <p className="eyebrow">{project.category?.name??"Project"}</p><h1>{project.name}</h1><p className="detail-tagline">{project.tagline}</p>
   <div className="detail-actions"><a className="button-primary" href={"/projects/"+project.slug+"/visit"}>Visit Project <ArrowUpRight size={16}/></a><ProjectUpvoteButton projectId={project.id} initialCount={project.upvote_count??0} initialUpvoted={project.viewer_upvoted}/><ShareButton url={publicUrl}/></div>
   {auctionPayment&&auctionPayment.razorpay_order_id&&auctionPayment.payment_deadline_at&&<div className="detail-auction-payment"><p className="eyebrow">Auction won</p><h2>Complete your homepage placement payment.</h2><p>Pay within 15 minutes of winning to keep this placement.</p><WinnerPayment orderId={auctionPayment.razorpay_order_id} amount={Number(auctionPayment.amount)} keyId={process.env.RAZORPAY_KEY_ID||""} expiresAt={auctionPayment.payment_deadline_at}/></div>}
  </div><aside className="detail-aside"><span>Launched</span><strong>{project.published_at?new Date(project.published_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"Published"}</strong>{creatorName&&<><span>Creator</span><strong className="detail-creator-name">{creatorProfile?.username?<Link href={"/u/"+creatorProfile.username}>{creatorName}</Link>:creatorName}{creatorTier&&<ProfileBadge tier={creatorTier}/>}</strong>{creatorTier&&<small className="detail-creator-tier">{creatorTier.label}</small>}{project.creator_id&&viewer?.id!==project.creator_id&&<FollowButton followingType="user" targetId={project.creator_id} initialFollowing={Boolean(creatorFollowing.data)} initialCount={Number(creatorFollowers.data??0)}/>}</>}{Object.entries(project.social_links??{}).map(([key,value])=><a key={key} href={value} target="_blank" rel="noreferrer">{key}</a>)}</aside></section>
  <section className="section detail-body"><div className="detail-copy"><p className="eyebrow">About</p><h2>{project.description}</h2><div className="detail-tags">{project.tags.map(tag=><span key={tag}>{tag}</span>)}</div></div>
  {project.preview_images.length>0&&<div className="detail-gallery">{project.preview_images.map((src,index)=><div className="detail-gallery-item" key={src}><img src={src} alt={project.name+" preview "+(index+1)} loading="lazy"/></div>)}</div>}</section>
  <ProjectComments projectId={project.id} initialComments={initialComments} viewerId={viewer?.id??null} viewerProfile={viewerProfile}/>
  {related.filter(item=>item.id!==project.id).length>0&&<section className="section"><SectionHeading eyebrow="More to explore" title="Related projects"/><div className="project-grid">{related.filter(item=>item.id!==project.id).map(item=><ProjectCard key={item.id} project={item}/>)}</div></section>}
 </main><Footer/></div>;
}
