import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function Payments(){
  if(!hasEnvVars) redirect("/login");
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
 const {data:payments}=await supabase.from("payments").select("id,razorpay_order_id,razorpay_payment_id,amount,currency,status,created_at,updated_at,promotion_id,auction_id,project_id,provider,metadata").eq("user_id",user.id).order("created_at",{ascending:false});
 const projectIds=[...new Set((payments??[]).map(payment=>payment.project_id).filter(Boolean))]; const promotionIds=[...new Set((payments??[]).map(payment=>payment.promotion_id).filter(Boolean))]; const auctionIds=[...new Set((payments??[]).map(payment=>payment.auction_id).filter(Boolean))];
 const [{data:projects},{data:promotions},{data:auctions}]=await Promise.all([
   projectIds.length?supabase.from("projects").select("id,name,slug").in("id",projectIds):Promise.resolve({data:[]}),
   promotionIds.length?supabase.from("promotions").select("id,type,homepage_slot,position_id").in("id",promotionIds):Promise.resolve({data:[]}),
   auctionIds.length?supabase.from("auctions").select("id,homepage_slot,winning_bid,winning_project_id").in("id",auctionIds):Promise.resolve({data:[]})
 ]);
 const projectMap=new Map((projects??[]).map(project=>[project.id,project])); const promotionMap=new Map((promotions??[]).map(promotion=>[promotion.id,promotion])); const auctionMap=new Map((auctions??[]).map(auction=>[auction.id,auction]));
 const formatDate=(value:string|null)=>value?new Date(value).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"—";
 const paymentType=(payment:{promotion_id:string|null;auction_id:string|null})=>payment.auction_id?"Homepage auction":payment.promotion_id?"Promotion":"Payment";
 return <div><Navbar authenticated/><main className="dashboard-shell shell"><div className="dashboard-head"><div><p className="eyebrow">Payments</p><h1>Payment history.</h1><p>Verified transaction records associated with your ProjectHub account.</p></div></div>
 <div className="list-panel">{payments?.length?payments.map(p=>{const project=projectMap.get(p.project_id); const promotion=p.promotion_id?promotionMap.get(p.promotion_id):null; const auction=p.auction_id?auctionMap.get(p.auction_id):null; return <div className="payment-history-row" key={p.id}><div className="payment-history-head"><div className="payment-history-project"><strong>{project?.name||"ProjectHub payment"}</strong>{project?.slug&&<Link href={"/projects/"+project.slug}>Open project ↗</Link>}</div><div className="list-row-right"><span className="state-chip">{p.status}</span><span>{formatDate(p.created_at)}</span></div></div><div className="payment-history-meta"><div><small>Type</small><strong>{paymentType(p)}</strong></div><div><small>Amount</small><strong>₹{Number(p.amount).toLocaleString("en-IN")} {p.currency}</strong></div>{auction?.homepage_slot&&<div><small>Homepage slot</small><strong>Slot {auction.homepage_slot}</strong></div>}{promotion?.homepage_slot&&!auction?.homepage_slot&&<div><small>Homepage slot</small><strong>Slot {promotion.homepage_slot}</strong></div>}<div><small>Provider</small><strong>{p.provider||"Razorpay"}</strong></div><div><small>Order ID</small><strong>{p.razorpay_order_id||"—"}</strong></div><div><small>Payment ID</small><strong>{p.razorpay_payment_id||"—"}</strong></div><div><small>Created</small><strong>{formatDate(p.created_at)}</strong></div><div><small>Updated</small><strong>{formatDate(p.updated_at)}</strong></div></div></div>;}):<div className="empty-state"><strong>No payments yet.</strong><span>Your verified payment records will appear here.</span></div>}</div>
 </main><Footer/></div>;
}