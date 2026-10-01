import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { CheckCircle2, Clock3, IndianRupee, XCircle } from "lucide-react";

const money=(n:number)=>`₹${Number(n||0).toLocaleString("en-IN")}`;
export default async function AdminPayments(){
  await requireAdmin("payments.view"); const db=createAdminClient();
  const {data}=await db.from("payments").select("id,user_id,project_id,amount,currency,plan,provider,provider_payment_id,status,created_at,promotion_id,provider_order_id,auction_id,razorpay_order_id,razorpay_payment_id,metadata").order("created_at",{ascending:false}).limit(200);
  const rows=data??[], paid=rows.filter(x=>x.status==="paid"), pending=rows.filter(x=>x.status==="pending"), failed=rows.filter(x=>["failed","cancelled"].includes(x.status));
  const revenue=paid.reduce((s,x)=>s+Number(x.amount||0),0);
  return <div className="admin-page">
    <div className="admin-heading"><p className="eyebrow">Monetization / payments</p><h1>Payments.</h1><p>Financial operations across promotions, auctions and launch products.</p></div>
    <div className="admin-stat-grid admin-stat-grid-detailed admin-stat-grid-4"><div className="admin-kpi"><div className="admin-kpi-top"><span>Paid</span><CheckCircle2 size={16}/></div><strong>{money(revenue)}</strong><small>{paid.length} successful records</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Pending</span><Clock3 size={16}/></div><strong>{pending.length}</strong><small>awaiting completion</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Failed</span><XCircle size={16}/></div><strong>{failed.length}</strong><small>failed or cancelled</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Average</span><IndianRupee size={16}/></div><strong>{paid.length?money(revenue/paid.length):"₹0"}</strong><small>successful transaction</small></div></div>
    <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Transaction ledger</p><h2>Payment records</h2></div></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Transaction</th><th>Purpose</th><th>Amount</th><th>Provider</th><th>Status</th><th>Time</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><strong>{p.razorpay_payment_id||p.provider_payment_id||p.id.slice(0,10)+"…"}</strong><small>{p.user_id.slice(0,10)}…</small></td><td><strong>{p.plan||"Payment"}</strong><small>{p.project_id?"Project "+p.project_id.slice(0,8)+"…":p.auction_id?"Auction "+p.auction_id.slice(0,8)+"…":p.promotion_id?"Promotion "+p.promotion_id.slice(0,8)+"…":"General"}</small></td><td><strong>{money(p.amount)}</strong><small>{p.currency||"INR"}</small></td><td><strong>{p.provider||"—"}</strong><small>{p.razorpay_order_id||p.provider_order_id||"No order id"}</small></td><td><span className={"admin-status "+(p.status==="paid"?"success":p.status==="pending"?"warning":"danger")}>{p.status}</span></td><td>{new Date(p.created_at).toLocaleString("en-IN")}</td></tr>)}</tbody></table>{!rows.length&&<div className="admin-empty">No payment records found.</div>}</div>
    </section>
  </div>;
}