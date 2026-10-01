"use client";

import { Share2, Check } from "lucide-react";
import { useState } from "react";

export function ShareButton({url}:{url:string}) {
  const [copied,setCopied]=useState(false);
  async function share(){
    try{
      if(navigator.share) await navigator.share({title:"ProjectHub project",url});
      else {await navigator.clipboard.writeText(url);setCopied(true);window.setTimeout(()=>setCopied(false),1800);}
    }catch{}
  }
  return <button className="button-outline" onClick={share}>{copied?<Check size={15}/>:<Share2 size={15}/>} {copied?"Copied":"Share"}</button>;
}
