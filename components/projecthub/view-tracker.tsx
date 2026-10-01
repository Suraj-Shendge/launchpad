"use client";

import { useEffect } from "react";
import { consentEventName, readConsent } from "@/components/projecthub/cookie-consent";

export function ViewTracker({projectId}:{projectId:string}) {
  useEffect(()=>{
    const send=()=>{
      if(!readConsent()?.analytics)return;
      void fetch("/api/projects/"+projectId+"/view",{method:"POST",keepalive:true}).catch(()=>{});
    };
    send();
    const event=()=>send();
    window.addEventListener(consentEventName(),event);
    return()=>window.removeEventListener(consentEventName(),event);
  },[projectId]);
  return null;
}
