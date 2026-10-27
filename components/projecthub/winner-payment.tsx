"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    Razorpay: new (options:Record<string,unknown>)=>{open():void};
  }
}

export function WinnerPayment({orderId,amount,keyId,expiresAt,provider="razorpay",paymentId}:{
  orderId:string;amount:number;keyId:string;expiresAt?:string|null;provider?:"razorpay"|"dodo";paymentId?:string
}) {
  const [busy,setBusy]=useState(false);
  const [remainingMs,setRemainingMs]=useState(0);
  useEffect(()=>{
    if(!expiresAt)return;
    const tick=()=>setRemainingMs(Math.max(0,new Date(expiresAt).getTime()-Date.now()));
    tick();
    const timer=window.setInterval(tick,1000);
    return ()=>window.clearInterval(timer);
  },[expiresAt]);
  const expired=Boolean(expiresAt)&&remainingMs<=0;
  const remainingSeconds=Math.ceil(remainingMs/1000);
  const countdown=Math.floor(remainingSeconds/60).toString().padStart(2,"0")+":"+String(remainingSeconds%60).padStart(2,"0");
  const [error,setError]=useState("");
  async function pay(){
    if(expired)return;
    setBusy(true);setError("");
    if(provider==="dodo"){
      if(!paymentId){setBusy(false);setError("Auction payment record missing. Refresh and retry.");return;}
      try{
        const response=await fetch("/api/payments/auction-checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({payment_id:paymentId})});
        const payload=await response.json().catch(()=>({}));
        if(!response.ok||typeof payload.checkout_url!=="string"){setBusy(false);setError(payload.error||"Could not create Dodo test checkout.");return;}
        window.location.href=payload.checkout_url;
      }catch{setBusy(false);setError("Could not connect to Dodo test checkout. Please try again.");}
      return;
    }
    if(!window.Razorpay){setBusy(false);setError("Payment checkout is not ready.");return}
    const checkout=new window.Razorpay({
      key:keyId,
      order_id:orderId,
      amount:Math.round(amount*100),
      currency:"INR",
      name:"ProjectHub",
      description:"Homepage auction winner payment",
      handler:async(response:Record<string,string>)=>{
        const result=await fetch("/api/payments/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
          order_id:response.razorpay_order_id,
          payment_id:response.razorpay_payment_id,
          signature:response.razorpay_signature
        })});
        const payload=await result.json().catch(()=>({}));
        setBusy(false);
        if(!result.ok){setError(payload.error||"Payment verification failed.");return}
        window.location.reload();
      },
      modal:{ondismiss:()=>setBusy(false)}
    });
    checkout.open();
  }
  return <div className="winner-payment">
    {provider==="razorpay"&&<Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive"/>}
    <div><span>Winner payment</span><strong>₹{amount.toLocaleString("en-IN")}</strong>{expiresAt&&!expired&&<small>Payment window · {countdown}</small>}{expired&&<small>Payment window expired</small>}</div>
    {!expired&&<button className="button-primary" onClick={pay} disabled={busy}>{busy?"Opening…":"Complete payment"}</button>}
    <small>{provider==="dodo"?"Test checkout via Dodo Payments":"Secure checkout via Razorpay"}</small>
    <a className="payment-policy-link" href="/refund-policy">Refund policy</a>
    {error&&<p className="form-error">{error}</p>}
  </div>;
}
