"use client";

import Link from "next/link";
import { useState } from "react";

type BidProject={id:string;name:string};

export function BidForm({auctionId,minimum,projects}:{auctionId:string;minimum:number;projects:BidProject[]}) {
  const [amount,setAmount]=useState(String(minimum));
  const [projectId,setProjectId]=useState(projects[0]?.id??"");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function placeBid(e:React.FormEvent){
    e.preventDefault(); if(!projectId){setMessage("Select a published project to bid.");return;}
    setBusy(true); setMessage("");
    const response=await fetch("/api/auctions/"+auctionId+"/bid",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({amount:Number(amount),project_id:projectId})
    });
    const payload=await response.json().catch(()=>({}));
    setBusy(false);
    setMessage(response.ok ? "Bid placed successfully." : (payload.error || "Bid could not be placed."));
  }
  return <form className="bid-form" onSubmit={placeBid}>
    {projects.length>1&&<select aria-label="Project to promote if you win" value={projectId} onChange={e=>setProjectId(e.target.value)}>{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select>}
    <input aria-label="Bid amount" type="number" min={minimum} value={amount} onChange={e=>setAmount(e.target.value)}/>
    <button className="button-primary" disabled={busy||!projects.length}>{busy?"Placing…":projects.length?"Place bid":"You havent launched a project yet."}</button>
    {!projects.length&&<span className="form-note bid-launch-note">Launch one here: <Link href="/launch">Launch</Link></span>}
    {message&&<span role="status" className="form-note">{message}</span>}
  </form>;
}