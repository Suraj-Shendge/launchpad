import Link from "next/link";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { CommunityNewThreadForm } from "@/components/projecthub/community-new-thread-form";
import { getCommunityForums, getCommunityViewer } from "@/lib/community";

export default async function NewCommunityThread() {
  const [forums, viewer] = await Promise.all([getCommunityForums(), getCommunityViewer()]);

  return <div>
    <Navbar authenticated={Boolean(viewer)} />
    <main className="section community-page">
      <div className="community-compose-page">
        <div className="community-compose-head">
          <div>
            <p className="eyebrow">Community</p>
            <h1 className="community-title">Start a discussion.</h1>
            <p className="community-subtitle">Ask a real question, share a useful insight, or show the community what you’re building.</p>
          </div>
          <Link href="/community" className="button-outline">Back to community</Link>
        </div>
        {viewer ? <CommunityNewThreadForm forums={forums}/> : <div className="community-login-card"><strong>Log in to join the conversation.</strong><span>You need a ProjectHub account to publish discussions and replies.</span><Link href="/login?next=/community/new" className="button-primary">Log in</Link></div>}
      </div>
    </main>
    <Footer/>
  </div>;
}
