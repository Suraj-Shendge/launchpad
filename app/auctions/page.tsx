import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { AuctionTimer } from "@/components/projecthub/auction-timer";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function Auctions(){
 if(!hasEnvVars)return <div><Navbar/><main className="section auction-board"><div style={{maxWidth:720,marginBottom:42}}><p className="eyebrow">Live marketplace</p><h1 className="section-title" style={{fontSize:"clamp(44px,6vw,72px)"}}>Homepage auctions.</h1><p className="section-copy">Homepage promotion is continuously allocated through 24-hour live auctions. You bid for the next available homepage placement; the placement itself stays anonymous.</p></div><div className="empty-state"><strong>No live auctions yet.</strong><span>Connect Supabase to activate bidding, scheduling and winner payments.</span></div></main><Footer/></div>;
 const supabase=await createClient();
 const adminClient=(await import("@/lib/supabase/admin")).createAdminClient();
 await adminClient.rpc("sync_homepage_auction_cycle");
 const [{data:auctions},{data:scheduled},{data:{user}}]=await Promise.all([
  supabase.from("homepage_auction_public").select("id,starting_price,current_bid,bid_increment,starts_at,ends_at,status,bid_by_project_name,bidder_count").eq("status","active").lte("starts_at",new Date().toISOString()).gt("ends_at",new Date().toISOString()).order("ends_at"),
  supabase.from("homepage_auction_public").select("id,starts_at").eq("status","scheduled").gt("starts_at",new Date().toISOString()).order("starts_at").limit(1),
  supabase.auth.getUser()
 ]);
 const serverNow=Date.now(); const nextScheduled=scheduled?.[0] as any;
 return <div><Navbar authenticated={Boolean(user)}/><main className="section auction-board">
  <div style={{maxWidth:720,marginBottom:42}}><p className="eyebrow">Live marketplace</p><h1 className="section-title" style={{fontSize:"clamp(44px,6vw,72px)"}}>Homepage auctions.</h1><p className="section-copy">Homepage promotion is continuously allocated through 24-hour live auctions. You bid for the next available homepage placement; the placement itself stays anonymous.</p></div>
  {auctions?.length ? <div className="auction-list">{auctions.map((a:any)=>{const current=Number(a.current_bid??a.starting_price);return <Link className="auction-market-card" href={"/auctions/"+a.id} key={a.id}>
    <div className="auction-market-top"><span>LIVE AUCTION</span><span className="auction-live-dot-label"><i/> LIVE</span></div>
    <div className="auction-market-timer"><span className="eyebrow">Ends in</span><AuctionTimer targetAt={a.ends_at} serverNow={serverNow}/></div>
    <div className="auction-card-current"><span>Current bid</span><strong>₹{current.toLocaleString("en-IN")}</strong></div>
    <div className="auction-market-bidder"><span>Bidders</span><strong>{Number(a.bidder_count??0)}</strong></div>
    <div className="auction-market-footer"><span>View auction</span><ArrowUpRight size={16}/></div>
  </Link>})}</div> : <div className="empty-state"><strong>No auctions are live right now.</strong><span>As homepage placements approach their next renewal window, new 24-hour auctions open automatically.</span></div>}
  {!auctions?.length&&nextScheduled&&<div className="auction-next-window"><div><p className="eyebrow">Next auction starts</p><AuctionTimer targetAt={nextScheduled.starts_at} serverNow={serverNow}/></div><span className="auction-next-note">The next homepage promotion auction opens when its current placement reaches the 24-hour renewal window.</span></div>}
 </main><Footer/></div>;
}