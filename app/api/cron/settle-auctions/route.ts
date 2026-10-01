import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpay } from "@/lib/payments/razorpay";
import { hasRazorpayEnv, hasSupabaseServerEnv } from "@/lib/utils";
import { serviceUnavailable } from "@/lib/api-response";

export async function GET(request:Request){
  const secret=process.env.CRON_SECRET;
  const auth=request.headers.get("authorization")||"";
  if(!secret || auth!=="Bearer "+secret)return new NextResponse("Unauthorized",{status:401});
  if(!hasSupabaseServerEnv||!hasRazorpayEnv)return serviceUnavailable("Auction settlement backend is not configured yet.");

  const admin=createAdminClient();
  const now=new Date();
  const {data:expiredPromotions}=await admin.from("promotions").select("id,homepage_slot").eq("status","active").lte("ends_at",now.toISOString()).limit(100);
  if(expiredPromotions?.length){
    await admin.from("promotions").update({status:"expired",updated_at:now.toISOString()}).in("id",expiredPromotions.map(x=>x.id));
    await admin.from("homepage_slots").update({active_promotion_id:null}).in("slot_number",(expiredPromotions??[]).map(x=>x.homepage_slot).filter(Boolean));
  }

  const {data:active,error}=await admin.from("auctions").select("id").eq("status","active").lte("ends_at",now.toISOString()).limit(50);
  if(error)return NextResponse.json({error:error.message},{status:500});

  let settled=0,extended=0,orders=0;
  for(const auction of active??[]){
    const {data:result,error:settleError}=await admin.rpc("settle_auction",{p_auction_id:auction.id});
    if(settleError)continue;
    const settledRow=Array.isArray(result)?result[0]:result;
    if(!settledRow?.winner_id||!settledRow?.winning_bid){
      if(settledRow?.ends_at && new Date(settledRow.ends_at).getTime()>Date.now()) extended++;
      continue;
    }
    settled++;

    const existing=await admin.from("payments").select("id").eq("auction_id",auction.id).maybeSingle();
    if(existing.data)continue;

    const order=await getRazorpay().orders.create({
      amount:Math.round(Number(settledRow.winning_bid)*100),
      currency:"INR",
      receipt:"ph_auction_"+auction.id,
      notes:{auction_id:auction.id,user_id:settledRow.winner_id}
    });

    const {error:paymentError}=await admin.from("payments").insert({
      user_id:settledRow.winner_id,
      project_id:settledRow.winning_project_id||settledRow.project_id||null,
      auction_id:auction.id,
      amount:Number(settledRow.winning_bid),
      currency:"INR",
      status:"pending",
      razorpay_order_id:order.id,
      metadata:{purpose:"auction_winner_payment"}
    });
    if(!paymentError)orders++;
  }
  const {data:cycleResult,error:cycleSyncError}=await admin.rpc("sync_homepage_auction_cycle");
  if(cycleSyncError)return NextResponse.json({error:cycleSyncError.message,settled,orders},{status:500});

  return NextResponse.json({
    ok:true,
    settled,
    extended,
    orders,
    homepageAuctionsCreated:Number(cycleResult??0),
    expiredPromotions:expiredPromotions?.length??0
  });
}
