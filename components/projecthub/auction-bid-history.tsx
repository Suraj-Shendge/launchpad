"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BidHistoryItem={bid_id:string;project_name:string;amount:number;created_at:string};

export function AuctionBidHistory({auctionId,bids}:{auctionId:string;bids:BidHistoryItem[]}){
  const router=useRouter();
  const [liveBids,setLiveBids]=useState(bids);
  const formatTime=(value:string)=>new Intl.DateTimeFormat("en-IN",{hour:"numeric",minute:"2-digit",hour12:true,timeZone:"Asia/Kolkata"}).format(new Date(value));
  useEffect(()=>{
    setLiveBids(bids);
  },[bids]);

  useEffect(()=>{
    const supabase=createClient();
    let cancelled=false;
    const refreshBids=async()=>{
      const {data,error}=await supabase.rpc("get_public_auction_bid_history",{p_auction_id:auctionId});
      if(!cancelled&&!error)setLiveBids((data??[]) as BidHistoryItem[]);
    };
    void refreshBids();
    const interval=window.setInterval(refreshBids,3000);
    return()=>{cancelled=true;window.clearInterval(interval);};
  },[auctionId]);

  useEffect(()=>{
    const supabase=createClient();
    const channel=supabase.channel("auction-bid-refresh-"+auctionId).on(
      "postgres_changes",
      {event:"INSERT",schema:"public",table:"auction_bids",filter:"auction_id=eq."+auctionId},
      ()=>router.refresh()
    ).subscribe();
    return()=>{void supabase.removeChannel(channel);};
  },[auctionId,router]);

  return <div className="auction-bid-history">
    <div className="auction-section-heading"><div><p className="eyebrow">Bid activity</p><h2>Latest bids</h2></div><span>{liveBids.length ? liveBids.length+" bids shown" : "No bids yet"}</span></div>
    {liveBids.length ? <div className="auction-bid-table">
      <div className="auction-bid-table-head"><span>Time</span><span>Project</span><span>Bid</span></div>
      {liveBids.map(bid=><div className="auction-bid-row" key={bid.bid_id}><time dateTime={bid.created_at}>{formatTime(bid.created_at)}</time><span>{bid.project_name}</span><strong>₹{Number(bid.amount).toLocaleString("en-IN")}</strong></div>)}
    </div> : <div className="auction-history-empty">Be the first maker to place a bid in this auction.</div>}
  </div>;
}