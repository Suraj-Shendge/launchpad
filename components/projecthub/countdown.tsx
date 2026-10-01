"use client";

import { useEffect, useState } from "react";

export function Countdown({endsAt,serverNow}:{endsAt:string;serverNow:number}) {
  const [remaining,setRemaining]=useState(Math.max(0,new Date(endsAt).getTime()-serverNow));
  useEffect(()=>{
    const id=window.setInterval(()=>setRemaining(Math.max(0,new Date(endsAt).getTime()-Date.now())),1000);
    return()=>window.clearInterval(id);
  },[endsAt]);
  const total=Math.floor(remaining/1000);
  const h=Math.floor(total/3600), m=Math.floor(total%3600/60), s=total%60;
  return <span>{remaining>0 ? h+"h "+String(m).padStart(2,"0")+"m "+String(s).padStart(2,"0")+"s" : "Ended"}</span>;
}
