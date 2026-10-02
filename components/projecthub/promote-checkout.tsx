"use client";

import Script from "next/script";
import { useState } from "react";

declare global {
  interface Window {
    Razorpay: new (options:Record<string,unknown>)=>{open():void};
  }
}

type ProjectOption={id:string;name:string;slug:string};

export function PromoteCheckout({projects,price,activeSlots=0,durationDays=7}:{projects:ProjectOption[];price:number;activeSlots?:number;durationDays?:number}) {
  const [projectId,setProjectId]=useState(projects[0]?.id||"");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const slots=Math.min(Math.max(activeSlots,0),5);
  const availableSlots=Math.max(5-slots,0);
  const duration=Math.max(Number(durationDays)||7,1);

  async function start(){
    if(!projectId||busy||availableSlots===0)return;
    setBusy(true); setError("");
    try {
      const idempotencyKey=crypto.randomUUID();
      const response=await fetch("/api/payments/order",{
        method:"POST",
        headers:{"content-type":"application/json","x-idempotency-key":idempotencyKey},
        body:JSON.stringify({project_id:projectId})
      });
      const order=await response.json().catch(()=>({}));
      if(!response.ok){
        setBusy(false);
        setError(order.error||"Could not create the payment order.");
        return;
      }
      if(!window.Razorpay){
        setBusy(false);
        setError("Payment checkout is still loading. Please try again.");
        return;
      }
      const razorpay=new window.Razorpay({
        key:order.key_id,
        amount:order.amount,
        currency:order.currency,
        name:"ProjectHub",
        description:"Featured project promotion",
        order_id:order.order_id,
        handler:async(response:Record<string,string>)=>{
          try {
            const verify=await fetch("/api/payments/verify",{
              method:"POST",
              headers:{"content-type":"application/json"},
              body:JSON.stringify({
                order_id:response.razorpay_order_id,
                payment_id:response.razorpay_payment_id,
                signature:response.razorpay_signature
              })
            });
            const result=await verify.json().catch(()=>({}));
            setBusy(false);
            if(!verify.ok){
              setError(result.error||"Payment verification failed. Your payment will be reconciled automatically if it was captured.");
              return;
            }
            window.location.href="/dashboard/promotions?paid=1";
          } catch {
            setBusy(false);
            setError("We could not confirm the payment response. Please check your Promotions dashboard before retrying.");
          }
        },
        modal:{ondismiss:()=>setBusy(false)}
      });
      razorpay.open();
    } catch {
      setBusy(false);
      setError("Could not connect to the payment service. Please try again.");
    }
  }

  return <div className="checkout-card">
    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive"/>
    <div className="checkout-card-head">
      <div>
        <p className="eyebrow">Explore Featured</p>
        <h2>Put your project in front of makers.</h2>
        <p>Featured projects appear above the Explore search bar for {duration} days.</p>
      </div>
      <div className="checkout-price"><span>Featured</span><strong>₹{price.toLocaleString("en-IN")}</strong><small>{duration} days</small></div>
    </div>
    <div className="checkout-slot-status"><span>{availableSlots} of 5 Featured slots available</span><i>{slots}/5 occupied</i></div>
    <label className="checkout-project-field">Project to feature
      <select value={projectId} onChange={e=>setProjectId(e.target.value)} disabled={!projects.length||busy||availableSlots===0}>
        {projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
    </label>
    {projects.length ? <>
      <button className="button-primary checkout-submit" onClick={start} disabled={busy||!projectId||availableSlots===0}>
        {busy?"Opening checkout…":availableSlots===0?"All Featured slots are occupied":"Continue to payment"}
      </button>
      <div className="checkout-footer"><a className="payment-policy-link" href="/refund-policy">Refund policy</a><span>Secure payment via Razorpay</span></div>
      {error&&<p className="form-error checkout-error" role="alert">{error}</p>}
    </> : <div className="empty-state"><strong>No published projects available.</strong><span>Publish a project before purchasing Featured placement.</span></div>}
  </div>;
}
