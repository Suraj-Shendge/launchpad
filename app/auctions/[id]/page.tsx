import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, Gavel, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { BidForm } from "@/components/projecthub/bid-form";
import { AuctionTimer } from "@/components/projecthub/auction-timer";
import { AuctionBidHistory } from "@/components/projecthub/auction-bid-history";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function AuctionDetail({params}:{params:Promise<{id:string}>}){
 if(!hasEnvVars)return <div><Navbar/><main className="section"><div className="empty-state"><strong>Auction unavailable.</strong><span>Connect Supabase to view live homepage auctions.</span></div></main><Footer/></div>;
 const {id}=await params; const supabase=await createClient();
 const [{data:auction},{data:{user}}]=await Promise.all([
  supabase.from("homepage_auction_public").select("id,starting_price,current_bid,bid_increment,starts_at,ends_at,status,current_bid_project_id,bid_by_project_name,bid_count,bidder_count").eq("id",id).eq("status","active").lte("starts_at",new Date().toISOString()).gt("ends_at",new Date().toISOString()).maybeSingle(),
  supabase.auth.getUser()
 ]);
 if(!auction)notFound();
 const current=Number(auction.current_bid??auction.starting_price), next=current+Number(auction.bid_increment), serverNow=Date.now();
 const [{data:myProjects},{data:bids},{data:durationSetting}]=await Promise.all([
  user ? supabase.from("projects").select("id,name").eq("owner_id",user.id).eq("status","published").order("name") : Promise.resolve({data:[] as {id:string;name:string}[]}),
  supabase.rpc("get_public_auction_bid_history",{p_auction_id:auction.id}),
  supabase.from("settings").select("value").eq("key","homepage_promotion_duration_days").maybeSingle()
 ]);
 const duration=Number((durationSetting?.value as any)??3), bidHistory=(bids??[]) as {bid_id:string;project_name:string;amount:number;created_at:string}[];
 return <div><Navbar authenticated={Boolean(user)}/><main className="section auction-detail-page">
  <Link href="/auctions" className="back-link"><ArrowLeft size={14}/> All auctions</Link>
  <section className="auction-live-header">
   <div className="auction-live-heading"><div className="auction-live-status"><i/> LIVE AUCTION</div><p className="eyebrow"><Gavel size={13}/> Homepage promotion</p><h1>Homepage Promotion Auction</h1><p>Compete for the next premium homepage spotlight. The destination homepage position remains undisclosed until the promotion is allocated.</p></div>
   <div className="auction-live-countdown"><span className="auction-countdown-label">Ends in</span><AuctionTimer targetAt={auction.ends_at} serverNow={serverNow}/><small>24-hour auction</small></div>
  </section>
  <section className="auction-detail-layout">
   <div className="auction-detail-main">
    <div className="auction-metric-strip">
     <div><span>Current bid</span><strong>₹{current.toLocaleString("en-IN")}</strong></div>
     <div><span>Minimum next bid</span><strong>₹{next.toLocaleString("en-IN")}</strong></div>
     <div><span>Bidders</span><strong>{Number(auction.bidder_count??0)}</strong></div>
     <div><span>Total bids</span><strong>{Number(auction.bid_count??0)}</strong></div>
    </div>
    <AuctionBidHistory bids={bidHistory}/>
    <section className="auction-info-section"><div className="auction-section-heading"><div><p className="eyebrow">The process</p><h2>How this auction works</h2></div></div><div className="auction-steps">
      <div><b>01</b><strong>Choose your project</strong><span>Select one of your published ProjectHub projects.</span></div>
      <div><b>02</b><strong>Place your bid</strong><span>Submit a bid at or above the current minimum.</span></div>
      <div><b>03</b><strong>Auction ends</strong><span>The highest valid bid wins the upcoming placement.</span></div>
      <div><b>04</b><strong>Pay & get promoted</strong><span>Complete winner payment and your selected project receives the spotlight.</span></div>
    </div></section>
    <section className="auction-info-section"><div className="auction-section-heading"><div><p className="eyebrow">Your prize</p><h2>What you get</h2></div></div><div className="auction-benefit-grid">
      <div><ShieldCheck size={17}/><strong>Homepage spotlight</strong><span>Your selected project is promoted on the ProjectHub homepage.</span></div>
      <div><Check size={17}/><strong>Three days of visibility</strong><span>Receive a three-day spotlight placement after successful winner payment.</span></div>
      <div><Gavel size={17}/><strong>Premium placement</strong><span>Win access to the paid homepage promotion opportunity.</span></div>
      <div><ArrowUpRight size={17}/><strong>Launch-page traffic</strong><span>Visitors can discover your project and open its ProjectHub page.</span></div>
    </div></section>
   </div>
   <aside className="auction-bid-panel"><div className="auction-bid-panel-inner"><p className="eyebrow">Your bid</p><div className="auction-bid-panel-price"><span>Current bid</span><strong>₹{current.toLocaleString("en-IN")}</strong><small>Next minimum ₹{next.toLocaleString("en-IN")}</small></div>
    {user ? <BidForm auctionId={auction.id} minimum={next} projects={myProjects??[]}/> : <div className="auction-detail-login"><p>Sign in to bid with one of your published projects.</p><Link href={"/login?next=/auctions/"+auction.id} className="button-primary">Log in to bid <ArrowUpRight size={15}/></Link></div>}
    <p className="auction-bid-note">Bids are final once submitted.</p>
   </div></aside>
  </section>
  <section className="auction-timeline-section"><div className="auction-section-heading"><div><p className="eyebrow">Auction timeline</p><h2>From opening to promotion</h2></div></div><div className="auction-timeline">
    <div className="is-done"><span>01</span><strong>Auction opened</strong><small>{new Date(auction.starts_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</small></div>
    <div className="is-live"><span>02</span><strong>Live bidding</strong><small>₹{current.toLocaleString("en-IN")} current</small></div>
    <div><span>03</span><strong>Auction closes</strong><small>{new Date(auction.ends_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</small></div>
    <div><span>04</span><strong>Winner payment</strong><small>15-minute payment window</small></div>
    <div><span>05</span><strong>Promotion begins</strong><small>{duration} days on homepage</small></div>
  </div></section>
  <section className="auction-rules-section"><div className="auction-section-heading"><div><p className="eyebrow">Need to know</p><h2>Frequently asked questions</h2></div></div><div className="auction-faq">
   <details><summary>Can I bid without a published project?</summary><p>No. You need at least one published ProjectHub project to place a bid.</p></details>
   <details><summary>Can I bid for multiple projects?</summary><p>Yes. You can participate using multiple published projects, but each bid is associated with one selected project.</p></details>
   <details><summary>What happens if someone outbids me?</summary><p>Your previous bid remains in the auction history, but you are no longer the highest bidder.</p></details>
   <details><summary>What happens if I win but don't pay?</summary><p>You have 15 minutes to complete payment. If payment is not completed within that window, the opportunity passes to the next-highest bidder.</p></details>
   <details><summary>How long is the promotion?</summary><p>The winning project receives a three-day spotlight on the ProjectHub homepage.</p></details>
   <details><summary>Are bids refundable?</summary><p>No. Bids are final and non-refundable once submitted.</p></details>
  </div></section>
 </main><Footer/></div>;
}