import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { HomeHero } from "@/components/projecthub/hero";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { ProjectCard } from "@/components/projecthub/project-card";
import { SectionHeading } from "@/components/projecthub/section-heading";
import { TrafficCounter } from "@/components/projecthub/traffic-counter";
import { getHomepageAuctionWinners, getTodayLaunches, getTrendingProjects } from "@/lib/data";

export default async function Home() {
  const [trending,launches,auctionWinners]=await Promise.all([
    getTrendingProjects(),
    getTodayLaunches(),
    getHomepageAuctionWinners(),
  ]);

  return <div className="page-shell"><Navbar/><main>
    <HomeHero auctionWinners={auctionWinners}/>
    <div className="shell home-visitor-row"><TrafficCounter/></div>
    <section className="section">
      <SectionHeading eyebrow="Trending this week" title="Projects getting attention" description="The launches makers are exploring right now." href="/explore"/>
      {trending.length ? <div className="project-grid">{trending.map(project=><ProjectCard key={project.id} project={project}/>)}</div> : <div className="empty-state"><strong>No published projects yet.</strong><span>Be the first maker to launch on ProjectHub.</span><div style={{marginTop:18}}><Link className="button-primary" href="/launch">Launch a project <ArrowUpRight size={16}/></Link></div></div>}
    </section>
    <section className="section home-launches-section">
      <SectionHeading eyebrow="Today" title="Today’s launches" description="Fresh projects just approved and published." href="/explore"/>
      {launches.length ? <div className="project-grid">{launches.map(project=><ProjectCard key={project.id} project={project}/>)}</div> : <div className="empty-state"><strong>No launches today.</strong><span>Come back after the next project is approved.</span></div>}
    </section>
    <section className="section home-newsletter-section"><div className="newsletter-home-cta"><div><p className="eyebrow">Weekly</p><h2>Stay close to what’s being built.</h2><p>Get the ProjectHub digest with new launches, maker stories and community highlights.</p></div><Link className="button-primary" href="/newsletter">Join the Newsletter <ArrowUpRight size={16}/></Link></div></section>
  </main><Footer/></div>;
}
