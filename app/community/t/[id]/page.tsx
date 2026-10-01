import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { CommunityReplyForm } from "@/components/projecthub/community-reply-form";
import { CommunityVoteButton } from "@/components/projecthub/community-vote-button";
import { ProfileBadge } from "@/components/projecthub/profile-badge";
import { FollowButton } from "@/components/projecthub/follow-button";
import { createClient } from "@/lib/supabase/server";
import { getCommunityThread, getCommunityViewer } from "@/lib/community";

type Params=Promise<{id:string}>;
function authorName(author:{display_name:string|null;username:string|null;name:string|null}|null|undefined){return author?.display_name||author?.username||author?.name||"ProjectHub member"}
function formatDate(value:string){return new Intl.DateTimeFormat("en",{month:"short",day:"numeric",year:"numeric"}).format(new Date(value))}

export default async function CommunityThreadPage({params}:{params:Params}){
 const {id}=await params;const [data,viewer]=await Promise.all([getCommunityThread(id),getCommunityViewer()]);if(!data)notFound();
 const {thread,posts}=data;
 const supabase=await createClient();
 const [authorFollowers,authorFollowing]=thread.author&&viewer&&thread.author.id!==viewer.id?await Promise.all([
  supabase.rpc("get_follow_count",{p_following_type:"user",p_following_id:thread.author.id}),
  supabase.rpc("is_following",{p_following_type:"user",p_following_id:thread.author.id})
 ]):[{data:0},{data:false}];
 return <div><Navbar authenticated={Boolean(viewer)}/><main className="section community-page">
  <div className="community-thread-breadcrumb"><Link href="/community">Community</Link><span>/</span>{thread.forum&&<><Link href={"/community/f/"+thread.forum.slug}>{thread.forum.name}</Link><span>/</span></>}<span>Discussion</span></div>
  <article className="community-detail"><header className="community-detail-header"><div className="community-detail-meta">{thread.is_pinned&&<span className="community-thread-badge">Pinned</span>}{thread.is_featured&&<span className="community-thread-badge is-featured">Featured</span>}<span>{thread.views} views</span><span>•</span><span>{formatDate(thread.created_at)}</span></div><h1>{thread.title}</h1><div className="community-detail-author"><div className="community-avatar">{authorName(thread.author).slice(0,1).toUpperCase()}</div><div><strong>{thread.author?.username?<Link href={"/u/"+thread.author.username}>{authorName(thread.author)}</Link>:authorName(thread.author)} {thread.author?.tier&&<ProfileBadge tier={thread.author.tier}/>}</strong><span>{thread.author?.tier?.label??"ProjectHub member"} · Started this discussion</span>{thread.author&&viewer&&thread.author.id!==viewer.id&&<FollowButton followingType="user" targetId={thread.author.id} initialFollowing={Boolean(authorFollowing.data)} initialCount={Number(authorFollowers.data??0)}/>}</div></div></header>
   <div className="community-detail-grid"><aside className="community-detail-vote"><CommunityVoteButton threadId={thread.id} initialCount={thread.vote_count} initialVoted={thread.viewer_voted}/><span>upvotes</span></aside><div className="community-detail-body"><div className="community-prose">{thread.content.split("\n\n").map(paragraph=><p key={paragraph}>{paragraph}</p>)}</div></div></div>
  </article>
  <section className="community-replies"><div className="community-replies-head"><h2>{posts.length} {posts.length===1?"reply":"replies"}</h2><span>Join the discussion with something useful.</span></div>
   {posts.length?<div className="community-post-list">{posts.map(post=><article key={post.id} className="community-post"><div className="community-avatar">{authorName(post.author).slice(0,1).toUpperCase()}</div><div className="community-post-body"><div className="community-post-meta"><strong>{authorName(post.author)} {post.author?.tier&&<ProfileBadge tier={post.author.tier}/>}</strong><span>•</span><span>{post.author?.tier?.label??""}</span><span>•</span><span>{formatDate(post.created_at)}</span></div><div className="community-prose"><p>{post.content}</p></div><Link href="#reply" className="community-post-reply">Reply</Link></div></article>)}</div>:<div className="community-empty community-empty-small"><strong>No replies yet.</strong><span>Be the first person to add something useful.</span></div>}
   <div id="reply" className="community-reply-card">{viewer?<CommunityReplyForm threadId={thread.id} locked={thread.is_locked}/>:<div className="community-login-card"><strong>Want to join in?</strong><span>Log in to reply to this discussion.</span><Link href={"/login?next=/community/t/"+thread.id+"#reply"} className="button-primary">Log in to reply</Link></div>}</div>
  </section>
 </main><Footer/></div>
}
