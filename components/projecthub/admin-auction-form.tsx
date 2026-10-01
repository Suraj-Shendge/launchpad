"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminAuctionForm({projects,positions,startingPrice,increment}:{projects:{id:string;name:string}[];positions:{id:string;name:string}[];startingPrice:number;increment:number}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const router=useRouter();
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");
  const data=Object.fromEntries(new FormData(e.currentTarget).entries());
  const res=await fetch("/api/admin/auctions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
  const p=await res.json().catch(()=>({}));setBusy(false);
  if(!res.ok){setError(p.error||"Could not create auction.");return}
  router.push("/admin/auctions");router.refresh();
 }
 return <form className="project-form" onSubmit={submit}>
  <label>Project<select name="project_id" required>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  <label>Placement<select name="position_id" required>{positions.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  <div className="form-grid"><label>Starting price<input name="starting_price" type="number" min={startingPrice} defaultValue={startingPrice} required/></label><label>Bid increment<input name="bid_increment" type="number" min={increment} defaultValue={increment} required/></label></div>
  <div className="form-grid"><label>Starts at<input name="starts_at" type="datetime-local" required/></label><label>Ends at<input name="ends_at" type="datetime-local" required/></label></div>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <button className="button-primary" disabled={busy}>{busy?"Creating…":"Create auction"}</button>
 </form>;
}
