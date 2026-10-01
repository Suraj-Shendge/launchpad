"use client";

import Script from "next/script";
import { useState } from "react";

declare global {
  interface Window {
    Razorpay: new (options:Record<string,unknown>)=>{open():void};
  }
}

export function WinnerPayment({orderId,amount,keyId}:{orderId:string;amount:number;keyId:string}) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function pay(){
    setBusy(true);setError("");
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
    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive"/>
    <div><span>Winner payment</span><strong>₹{amount.toLocaleString("en-IN")}</strong></div>
    <button className="button-primary" onClick={pay} disabled={busy}>{busy?"Opening…":"Pay now"}</button>
    {error&&<p className="form-error">{error}</p>}
  </div>;
}
