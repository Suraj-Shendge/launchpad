"use client";

import { useEffect, useMemo, useState } from "react";

function parts(targetAt:string,serverNow:number){
  const left=Math.max(0,new Date(targetAt).getTime()-serverNow);
  const total=Math.floor(left/1000);
  return {left,h:Math.floor(total/3600),m:Math.floor(total%3600/60),s:total%60};
}

export function AuctionTimer({targetAt,serverNow}:{targetAt:string;serverNow:number}){
  const [remaining,setRemaining]=useState(()=>parts(targetAt,serverNow));
  useEffect(()=>{
    const tick=()=>setRemaining(parts(targetAt,Date.now()));
    tick();
    const id=window.setInterval(tick,1000);
    return()=>window.clearInterval(id);
  },[targetAt]);
  const values=useMemo(()=>[
    ["HR",String(remaining.h).padStart(2,"0")],
    ["MIN",String(remaining.m).padStart(2,"0")],
    ["SEC",String(remaining.s).padStart(2,"0")]
  ] as const,[remaining.h,remaining.m,remaining.s]);

  if(remaining.left<=0)return <span className="auction-timer-ended">Ended</span>;
  return <span className="auction-timer">{values.map(([label,value])=><span className="auction-timer-unit" key={label}><strong key={value}>{value}</strong><small>{label}</small></span>)}</span>;
}
