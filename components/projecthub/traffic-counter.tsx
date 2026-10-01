"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { consentEventName, readConsent } from "@/components/projecthub/cookie-consent";

export function TrafficCounter(){
  const [count,setCount]=useState<number|null>(null);
  useEffect(()=>{
    const send=()=>{
      if(!readConsent()?.analytics){setCount(null);return}
      void fetch("/api/traffic",{method:"POST",keepalive:true}).then(async response=>{
        const payload=await response.json().catch(()=>({}));
        if(response.ok&&typeof payload.count==="number")setCount(payload.count);
      }).catch(()=>{});
    };
    send();
    const event=()=>send();
    window.addEventListener(consentEventName(),event);
    return()=>window.removeEventListener(consentEventName(),event);
  },[]);
  return <div className={"visitor-counter"+(count===null?" visitor-counter-loading":"")}><span className="visitor-live-dot"/>
    <Eye size={14}/>
    {count===null?<span>Visitor analytics are optional</span>:<><strong>{count.toLocaleString("en-IN")}</strong><span>makers have visited ProjectHub</span></>}
  </div>;
}
