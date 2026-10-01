"use client";

type BidHistoryItem={bid_id:string;project_name:string;amount:number;created_at:string};

export function AuctionBidHistory({bids}:{bids:BidHistoryItem[]}){
  const formatTime=(value:string)=>new Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit"}).format(new Date(value));
  return <div className="auction-bid-history">
    <div className="auction-section-heading"><div><p className="eyebrow">Bid activity</p><h2>Latest bids</h2></div><span>{bids.length ? bids.length+" bids shown" : "No bids yet"}</span></div>
    {bids.length ? <div className="auction-bid-table">
      <div className="auction-bid-table-head"><span>Time</span><span>Project</span><span>Bid</span></div>
      {bids.map(bid=><div className="auction-bid-row" key={bid.bid_id}><time dateTime={bid.created_at}>{formatTime(bid.created_at)}</time><span>{bid.project_name}</span><strong>₹{Number(bid.amount).toLocaleString("en-IN")}</strong></div>)}
    </div> : <div className="auction-history-empty">Be the first maker to place a bid in this auction.</div>}
  </div>;
}