import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { getAdminAccess } from "@/lib/admin-access";
import { AdminAuctionActions } from "@/components/projecthub/admin-auction-actions";
import { Gavel, IndianRupee, Trophy, Users } from "lucide-react";

const money=(n:number)=>`₹${Number(n||0).toLocaleString("en-IN")}`;
export default async function AdminAuctions(){
  await requireAdmin("auctions.view"); const {access}=await getAdminAccess(); const db=createAdminClient();
  await db.rpc("sync_homepage_auction_cycle");
  const {data}=await db.from("auctions").select("id,project_id,position_id,homepage_slot,starting_price,current_bid,current_bid_project_id,bid_increment,starts_at,ends_at,status,winner_id,winning_bid,winning_project_id,created_at").order("ends_at").limit(200);
  const rows=data??[];
  const now=Date.now();
  const liveRows=rows.filter(x=>x.status==="active"&&new Date(x.starts_at).getTime()<=now&&new Date(x.ends_at).getTime()>now);
  const scheduledRows=rows.filter(x=>x.status==="scheduled"&&new Date(x.starts_at).getTime()>now);
  const ids=rows.map(x=>x.id), projects=[...new Set(rows.map(x=>x.project_id).filter(Boolean))];
  const [bids,projectRows]=await Promise.all([
    ids.length?db.from("auction_bids").select("auction_id,bidder_id,amount").in("auction_id",ids):Promise.resolve({data:[]}),
    projects.length?db.from("projects").select("id,name").in("id",projects):Promise.resolve({data:[]})
  ]);
  const bidMap=new Map<string,number>(),bidderMap=new Map<string,Set<string>>();
  for(const b of bids.data??[]){bidMap.set(b.auction_id,(bidMap.get(b.auction_id)||0)+1);if(!bidderMap.has(b.auction_id))bidderMap.set(b.auction_id,new Set());bidderMap.get(b.auction_id)!.add(b.bidder_id);}
  const names=new Map((projectRows.data??[]).map(x=>[x.id,x.name]));
  return <div className="admin-page">
    <div className="admin-heading admin-toolbar"><div><p className="eyebrow">Monetization / auctions</p><h1>Auctions.</h1><p>Manage scheduled inventory, live bidding, winners and settlement.</p></div>{(access.permissions.includes("auctions.manage")||access.isSuperAdmin)&&<Link href="/admin/auctions/new" className="button-primary">Create auction</Link>}</div>
    <div className="admin-stat-grid admin-stat-grid-detailed admin-stat-grid-4"><div className="admin-kpi"><div className="admin-kpi-top"><span>Live</span><Gavel size={16}/></div><strong>{liveRows.length}</strong><small>currently bidding</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Scheduled</span><Gavel size={16}/></div><strong>{scheduledRows.length}</strong><small>upcoming auctions</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Bids</span><Users size={16}/></div><strong>{bids.data?.length??0}</strong><small>recorded bids</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Settled value</span><Trophy size={16}/></div><strong>{money(rows.reduce((s,x)=>s+Number(x.winning_bid||0),0))}</strong><small>winning bids recorded</small></div></div>
    <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Auction inventory</p><h2>Bid operations</h2></div></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Project</th><th>Slot / timing</th><th>Bid</th><th>Activity</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map(a=><tr key={a.id}><td><strong>{names.get(a.project_id)||"Project"}</strong><small>{a.project_id?.slice(0,10)||"No project"}…</small></td><td><strong>Slot {a.homepage_slot}</strong><small>{new Date(a.starts_at).toLocaleString("en-IN")}</small><small>Ends {new Date(a.ends_at).toLocaleString("en-IN")}</small></td><td><strong>{money(a.current_bid??a.starting_price)}</strong><small>Start {money(a.starting_price)} · +{money(a.bid_increment)}</small></td><td><strong>{bidMap.get(a.id)||0} bids</strong><small>{bidderMap.get(a.id)?.size||0} bidders</small></td><td><span className={"admin-status "+(a.status==="active"?"success":a.status==="settled"?"gold":"neutral")}>{a.status}</span>{a.winner_id&&<small>Winner {a.winner_id.slice(0,8)}…</small>}</td><td><AdminAuctionActions id={a.id} status={a.status} canManage={access.permissions.includes("auctions.manage")||access.isSuperAdmin}/></td></tr>)}</tbody></table>{!rows.length&&<div className="admin-empty">No auctions found.</div>}</div>
    </section>
  </div>;
}