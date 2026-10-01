import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { CommunitySearch, CommunitySidebar, CommunitySortTabs, CommunityThreadList } from "@/components/projecthub/community-ui";
import { getCommunityForums, getCommunityThreads, getCommunityViewer } from "@/lib/community";

type Params = Promise<{ q?: string; sort?: string }>;

export const metadata: Metadata = {
  title: "Community",
  description: "Ask questions, share what you are building, get feedback, and learn from other makers on ProjectHub.",
  alternates: { canonical: "/community" },
  openGraph: { title: "Community — ProjectHub", description: "Discussions, feedback and ideas from ProjectHub makers.", type: "website" },
};

export default async function Community({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const search = params.q?.trim() || "";
  const sort = params.sort === "popular" || params.sort === "new" ? params.sort : "trending";
  const [forums, threads, viewer] = await Promise.all([
    getCommunityForums(),
    getCommunityThreads({ search, sort }),
    getCommunityViewer(),
  ]);

  return <div>
    <Navbar authenticated={Boolean(viewer)} />
    <main className="section community-page">
      <div className="community-hero">
        <div>
          <p className="eyebrow">Community</p>
          <h1 className="community-title">Build together.</h1>
          <p className="community-subtitle">Ask questions, share what you’re building, get feedback, and learn from other makers.</p>
        </div>
        <Link href={viewer ? "/community/new" : "/login?next=/community/new"} className="button-primary">Start a discussion</Link>
      </div>

      <div className="community-layout">
        <CommunitySidebar forums={forums}/>
        <section className="community-content" aria-label="Community discussions">
          <CommunitySearch search={search} sort={sort}/>
          <div className="community-list-head">
            <div><h2>{search ? "Search results" : "Latest conversations"}</h2><span>{threads.length} {threads.length === 1 ? "discussion" : "discussions"}</span></div>
            <CommunitySortTabs sort={sort} search={search}/>
          </div>
          {threads.length ? <CommunityThreadList threads={threads}/> : <div className="community-empty"><strong>No discussions yet.</strong><span>Start the first conversation and give other makers something useful to respond to.</span><Link href={viewer ? "/community/new" : "/login?next=/community/new"} className="button-primary">Start a discussion</Link></div>}
        </section>
      </div>
    </main>
    <Footer/>
  </div>;
}
