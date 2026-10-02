import Link from "next/link";
import { ArrowUpRight, Sparkles, WandSparkles } from "lucide-react";
import { AuctionStack } from "@/components/projecthub/auction-stack";
import type { Project } from "@/lib/types";

type Winner=Project & { winningBid:number|null; auctionEndsAt:string|null };

export function HomeHero({auctionWinners}:{auctionWinners:Winner[]}) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow-row"><span className="eyebrow-dot"/><span>Product discovery for founders & makers</span></div>
        <h1>Discover new products & tools.<br/><em>Launch yours. Get discovered.</em></h1>
        <p>ProjectHub is a product discovery and launch platform for founders, indie makers and developers to showcase startups, products, tools and ideas.</p>
        <form className="hero-launch" action="/launch" method="get">
          <Sparkles size={18}/>
          <input name="url" type="url" placeholder="Paste your project URL" aria-label="Project URL" required/>
          <button type="submit">Launch My Project <ArrowUpRight size={15}/></button>
        </form>
        <div className="hero-note"><WandSparkles size={14}/><span>Paste a URL to pre-fill your launch details from Metadata.</span></div>
        <div className="hero-actions">
          <Link href="/explore" className="button-quiet">Explore Projects</Link>
          <Link href="/auctions" className="button-quiet">See Auctions</Link>
        </div>
      </div>
      <div className="hero-art">
        <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
        <AuctionStack projects={auctionWinners}/>
      </div>
    </section>
  );
}
