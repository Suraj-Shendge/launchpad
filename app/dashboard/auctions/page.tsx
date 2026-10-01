import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { WinnerPayment } from "@/components/projecthub/winner-payment";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function DashboardAuctions(){
  if(!hasEnvVars) redirect("/login");
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login");

  const [{data:bids},{data:wins},{data:payments}]=await Promise.all([
    supabase.from("dashboard_auction_bids").select("id,amount,created_at,auction_id,ends_at,status").order("created_at",{ascending:false}),
    supabase.from("dashboard_auction_wins").select("id,winning_bid,ends_at,status,project_name,project_slug").order("ends_at",{ascending:false}),
    supabase.from("payments").select("id,auction_id,razorpay_order_id,amount,status").eq("user_id",user.id).not("auction_id","is",null),
  ]);
  const paymentMap=new Map((payments??[]).map((payment:any)=>[payment.auction_id,payment]));

  return <div><Navbar authenticated/><main className="dashboard-shell shell">
    <div className="dashboard-head"><div><p className="eyebrow">Auctions</p><h1>Your auction activity.</h1><p>Review bids, wins and winner payments.</p></div><Link href="/auctions" className="button-primary">Live auctions</Link></div>
    {wins?.length ? <><h2 className="dashboard-subtitle">Won placements</h2><div className="list-panel">{wins.map((auction:any)=>{
      const payment=paymentMap.get(auction.id);
      return <div className="list-row" key={auction.id}>
        <div><strong>{auction.project_name||"Project"}</strong><span>Winning bid · ₹{Number(auction.winning_bid).toLocaleString("en-IN")}</span></div>
        <div className="list-row-right">
          {payment?.status==="paid" ? <span className="state-chip">Paid</span>
           : payment?.razorpay_order_id ? <WinnerPayment orderId={payment.razorpay_order_id} amount={Number(payment.amount)} keyId={process.env.RAZORPAY_KEY_ID||""}/>
           : <span className="state-chip">Payment pending</span>}
        </div>
      </div>;
    })}</div></> : null}
    <h2 className="dashboard-subtitle">Bid history</h2>
    <div className="list-panel">{bids?.length ? bids.map((bid:any)=><div className="list-row" key={bid.id}>
      <div><strong>₹{Number(bid.amount).toLocaleString("en-IN")}</strong><span>{bid.status??"unknown"}</span></div>
      <div className="list-row-right"><span>{bid.ends_at?new Date(bid.ends_at).toLocaleString("en-IN"):""}</span></div>
    </div>) : <div className="empty-state"><strong>No bids yet.</strong><span>Join a live homepage auction to compete for placement.</span></div>}</div>
  </main><Footer/></div>;
}