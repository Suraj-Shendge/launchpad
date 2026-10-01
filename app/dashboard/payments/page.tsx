import { redirect } from "next/navigation";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function Payments(){
  if(!hasEnvVars) redirect("/login");
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
 const {data:payments}=await supabase.from("payments").select("id,razorpay_order_id,razorpay_payment_id,amount,currency,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false});
 return <div><Navbar authenticated/><main className="dashboard-shell shell"><div className="dashboard-head"><div><p className="eyebrow">Payments</p><h1>Payment history.</h1><p>Verified transaction records associated with your ProjectHub account.</p></div></div>
 <div className="list-panel">{payments?.length?payments.map(p=><div className="list-row" key={p.id}><div><strong>{p.razorpay_order_id||"Payment"}</strong><span>₹{Number(p.amount).toLocaleString("en-IN")} {p.currency}</span></div><div className="list-row-right"><span className="state-chip">{p.status}</span><span>{new Date(p.created_at).toLocaleDateString("en-IN")}</span></div></div>):<div className="empty-state"><strong>No payments yet.</strong><span>Your verified payment records will appear here.</span></div>}</div>
 </main><Footer/></div>;
}