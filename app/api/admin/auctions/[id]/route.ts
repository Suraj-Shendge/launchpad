import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuctionWinnerPayment } from "@/lib/payments/auction-winner";

const schema=z.object({action:z.enum(["activate","extend","cancel","close","settle"])});

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireAdminApi("auctions.manage");if("error" in auth)return auth.error;
 const {id}=await params;
 const parsed=schema.safeParse(await request.json().catch(()=>({})));
 if(!parsed.success)return NextResponse.json({error:"Invalid auction action."},{status:400});
 const admin=createAdminClient();
 const {data:auction,error:readError}=await admin.from("auctions").select("id,status,starts_at,ends_at").eq("id",id).maybeSingle();
 if(readError)return NextResponse.json({error:readError.message},{status:500});
 if(!auction)return NextResponse.json({error:"Auction not found."},{status:404});
 const action=parsed.data.action;
 let paymentWarning:string|undefined;
 if(action==="activate"){
  if(auction.status!=="scheduled")return NextResponse.json({error:"Only scheduled auctions can be activated."},{status:409});
  const now=new Date().toISOString();
  const {error}=await admin.from("auctions").update({status:"active",starts_at:now,updated_at:now}).eq("id",id);
  if(error)return NextResponse.json({error:error.message},{status:500});
 }
 if(action==="extend"){
  if(auction.status!=="active")return NextResponse.json({error:"Only active auctions can be extended."},{status:409});
  const {data:setting}=await admin.from("settings").select("value").eq("key","homepage_auction_duration_hours").maybeSingle();
  const hours=Math.min(168,Math.max(1,Number(setting?.value??24)));
  const now=new Date().toISOString();
  const end=new Date(new Date(auction.ends_at).getTime()+hours*3600000).toISOString();
  const {error}=await admin.from("auctions").update({ends_at:end,updated_at:now}).eq("id",id);
  if(error)return NextResponse.json({error:error.message},{status:500});
 }
 if(action==="cancel"){
  if(!["scheduled","active"].includes(auction.status))return NextResponse.json({error:"Only scheduled or active auctions can be cancelled."},{status:409});
  const {error}=await admin.from("auctions").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",id);
  if(error)return NextResponse.json({error:error.message},{status:500});
 }
 if(action==="close"){
  if(auction.status!=="active")return NextResponse.json({error:"Only active auctions can be closed."},{status:409});
  const now=new Date().toISOString();
  const {error:endError}=await admin.from("auctions").update({ends_at:now,updated_at:now}).eq("id",id).eq("status","active");
  if(endError)return NextResponse.json({error:endError.message},{status:500});
  const {data:topBid,error:bidError}=await admin.from("auction_bids").select("id").eq("auction_id",id).order("amount",{ascending:false}).order("created_at",{ascending:true}).limit(1).maybeSingle();
  if(bidError)return NextResponse.json({error:bidError.message},{status:500});
  if(!topBid){
   const {error:endedError}=await admin.from("auctions").update({status:"ended",updated_at:now}).eq("id",id).eq("status","active");
   if(endedError)return NextResponse.json({error:endedError.message},{status:500});
  }else{
   const {data:settled,error:settleError}=await admin.rpc("settle_auction",{p_auction_id:id});
   if(settleError)return NextResponse.json({error:settleError.message},{status:500});
   const row=Array.isArray(settled)?settled[0]:settled;
   const payment=await createAuctionWinnerPayment(admin,row);
   if(!payment.ok)paymentWarning="Auction closed and settled, but the winner payment needs recovery: "+payment.status+".";
  }
 }
 if(action==="settle"){
  if(auction.status!=="ended")return NextResponse.json({error:"Only ended auctions can be settled."},{status:409});
  const {error}=await admin.rpc("settle_auction",{p_auction_id:id});
  if(error)return NextResponse.json({error:error.message},{status:500});
 }
 const {data:{user}}=await auth.supabase.auth.getUser();
 if(user)await admin.from("admin_actions").insert({admin_id:user.id,action:"auction_"+action,target_type:"auction",target_id:id,metadata:{action}});
 return NextResponse.json({ok:true,...(paymentWarning?{warning:paymentWarning}:{})});
}
