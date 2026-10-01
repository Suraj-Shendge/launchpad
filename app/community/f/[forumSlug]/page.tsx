import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { CommunitySearch, CommunitySidebar, CommunitySortTabs, CommunityThreadList } from "@/components/projecthub/community-ui";
import { FollowButton } from "@/components/projecthub/follow-button";
import { getCommunityForums, getCommunityThreads } from "@/lib/community";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ forumSlug: string }>;
type SearchParams = Promise<{ q?: string; sort?: string }>;

export default async function CommunityForumPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { forumSlug } = await params;
  const query = await searchParams;
  const forums = await getCommunityForums();
  const forum = forums.find((item) => item.slug === forumSlug);
  if (!forum) notFound();

  const search = query.q?.trim() || "";
  const sort = query.sort === "popular" || query.sort === "new" ? query.sort : "trending";
  const supabase=await createClient();
  const {data:{user:viewer}}=await supabase.auth.getUser();
  const [threads, followerCount, isFollowing] = await Promise.all([
    getCommunityThreads({ forumSlug, search, sort }),
    supabase.rpc("get_follow_count",{p_following_type:"forum",p_following_id:forum.id}),
    viewer ? supabase.rpc("is_following",{p_following_type:"forum",p_following_id:forum.id}) : Promise.resolve({data:false}),
  ]);

  return <div>
    <Navbar authenticated={Boolean(viewer)} />
    <main className="section community-page">
      <div className="community-hero community-hero-compact">
        <div>
          <p className="eyebrow">Forum</p>
          <h1 className="community-title">{forum.name}</h1>
          <p className="community-subtitle">{forum.description}</p>
        </div>
        <div className="community-hero-actions">{viewer&&<FollowButton followingType="forum" targetId={forum.id} initialFollowing={Boolean(isFollowing.data)} initialCount={Number(followerCount.data??0)}/>}<Link href={viewer ? "/community/new" : "/login?next=/community/new"} className="button-primary">Start a discussion</Link></div>
      </div>

      <div className="community-layout">
        <CommunitySidebar forums={forums} activeSlug={forum.slug}/>
        <section className="community-content" aria-label={forum.name + " discussions"}>
          <CommunitySearch search={search} sort={sort} forumSlug={forum.slug}/>
          <div className="community-list-head">
            <div><h2>{search ? "Search results" : "Discussions"}</h2><span>{threads.length} {threads.length === 1 ? "discussion" : "discussions"}</span></div>
            <CommunitySortTabs sort={sort} forumSlug={forum.slug} search={search}/>
          </div>
          {threads.length ? <CommunityThreadList threads={threads}/> : <div className="community-empty"><strong>No discussions here yet.</strong><span>Be the first maker to start a conversation in {forum.name}.</span><Link href={viewer ? "/community/new" : "/login?next=/community/new"} className="button-primary">Start a discussion</Link></div>}
        </section>
      </div>
    </main>
    <Footer/>
  </div>;
}
