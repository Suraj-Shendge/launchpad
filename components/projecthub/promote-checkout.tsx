"use client";

import Script from "next/script";
import { useState } from "react";

declare global {
  interface Window {
    Razorpay: new (options:Record<string,unknown>)=>{open():void};
  }
}

export function PromoteCheckout({projects,price}:{projects:{id:string;name:string;slug:string}[];price:number}) {
  const [projectId,setProjectId]=useState(projects[0]?.id||"");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function start(){
    if(!projectId)return;
    setBusy(true); setError("");
    const response=await fetch("/api/payments/order",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({project_id:projectId})
    });
    const order=await response.json().catch(()=>({}));
    if(!response.ok){setBusy(false);setError(order.error||"Could not create payment order.");return}
    if(!window.Razorpay){setBusy(false);setError("Razorpay Checkout is not ready yet.");return}
    const razorpay=new window.Razorpay({
      key:order.key_id,
      amount:order.amount,
      currency:order.currency,
      name:"ProjectHub",
      description:"Featured project promotion",
      order_id:order.order_id,
      handler:async(response:Record<string,string>)=>{
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
        if(!verify.ok){setError(result.error||"Payment verification failed.");return}
        window.location.href="/dashboard/promotions?paid=1";
      },
      modal:{ondismiss:()=>setBusy(false)}
    });
    razorpay.open();
  }
  return <div className="checkout-card">
    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive"/>
    <label>Project to feature<select value={projectId} onChange={e=>setProjectId(e.target.value)}>
      {projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}
    </select></label>
    {projects.length ? <>
      <div className="checkout-total"><span>Featured promotion</span><strong>₹{price.toLocaleString("en-IN")}</strong></div>
      <button className="button-primary" onClick={start} disabled={busy}>{busy?"Opening checkout…":"Continue to payment"}</button>
      {error&&<p className="form-error" role="alert">{error}</p>}
    </> : <div className="empty-state"><strong>No published projects available.</strong><span>Publish a project before purchasing featured placement.</span></div>}
  </div>;
}