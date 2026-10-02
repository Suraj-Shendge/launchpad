import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuctionWinnerPayment } from "@/lib/payments/auction-winner";
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

  const endingSoonUntil=new Date(now.getTime()+5*60*1000).toISOString();
  const {data:endingSoonAuctions}=await admin.from("auctions")
    .select("id,ends_at,homepage_slot")
    .eq("status","active")
    .gt("ends_at",now.toISOString())
    .lte("ends_at",endingSoonUntil)
    .limit(50);
  for(const auction of endingSoonAuctions??[]){
    const {data:topBid}=await admin.from("auction_bids")
      .select("bidder_id,project_id,amount")
      .eq("auction_id",auction.id)
      .order("amount",{ascending:false})
      .order("created_at",{ascending:true})
      .limit(1)
      .maybeSingle();
    if(!topBid)continue;
    const {data:project}=await admin.from("projects").select("name").eq("id",topBid.project_id).maybeSingle();
    const {data:existingEndingNotice}=await admin.from("notifications").select("id")
      .eq("user_id",topBid.bidder_id)
      .eq("type","auction_ending_soon")
      .eq("reference_type","auction")
      .eq("reference_id",auction.id)
      .maybeSingle();
    if(!existingEndingNotice){
      await admin.from("notifications").insert({
        user_id:topBid.bidder_id,
        type:"auction_ending_soon",
        title:"Auction ending soon",
        message:"Your current bid of ₹"+Number(topBid.amount).toLocaleString("en-IN")+
          (project?.name?" on "+project.name:" on this auction")+" is currently winning. The auction ends within 5 minutes.",
        link:"/auctions/"+auction.id,
        reference_type:"auction",
        reference_id:auction.id
      });
    }
  }

  for(const auction of active??[]){
    const {data:result,error:settleError}=await admin.rpc("settle_auction",{p_auction_id:auction.id});
    if(settleError)continue;
    const settledRow=Array.isArray(result)?result[0]:result;
    if(!settledRow?.winner_id||!settledRow?.winning_bid){
      if(settledRow?.ends_at && new Date(settledRow.ends_at).getTime()>Date.now()) extended++;
      continue;
    }
    settled++;
    const payment=await createAuctionWinnerPayment(admin,{
      auction_id:auction.id,
      winner_id:settledRow.winner_id,
      winning_bid:settledRow.winning_bid,
      winning_project_id:settledRow.winning_project_id
    });
    if(payment.status==="created")orders++;
  }

  const {data:expiredClaims}=await admin.from("payments")
    .select("id,auction_id,user_id,auction_payment_round")
    .eq("status","pending")
    .eq("auction_payment_round",1)
    .not("auction_id","is",null)
    .not("payment_deadline_at","is",null)
    .lte("payment_deadline_at",now.toISOString())
    .limit(50);

  for(const claim of expiredClaims??[]){
    const {data:expiredClaim}=await admin.from("payments").update({
      status:"expired",
      updated_at:now.toISOString()
    }).eq("id",claim.id).eq("status","pending").eq("auction_payment_round",1)
      .select("id,auction_id,user_id").maybeSingle();
    if(!expiredClaim?.auction_id)continue;

    const {data:auction}=await admin.from("auctions")
      .select("id,winner_id,winning_bid,winning_project_id,project_id,status,homepage_slot,position_id")
      .eq("id",expiredClaim.auction_id).maybeSingle();
    if(!auction||auction.status!=="settled"||auction.winner_id!==expiredClaim.user_id)continue;

    const {data:bids}=await admin.from("auction_bids")
      .select("bidder_id,project_id,amount,created_at")
      .eq("auction_id",auction.id)
      .order("amount",{ascending:false})
      .order("created_at",{ascending:true})
      .limit(100);

    let fallbackBid:any=null;
    let fallbackProject:any=null;
    for(const bid of bids??[]){
      if(bid.bidder_id===expiredClaim.user_id)continue;
      const {data:candidateProject}=await admin.from("projects")
        .select("id,name,slug")
        .eq("id",bid.project_id)
        .eq("owner_id",bid.bidder_id)
        .eq("status","published")
        .maybeSingle();
      if(candidateProject){fallbackBid=bid;fallbackProject=candidateProject;break;}
    }
    if(!fallbackBid||!fallbackProject)continue;

    const fallbackKey="auction:"+auction.id+":round:2";
    const {data:existingFallback}=await admin.from("payments")
      .select("id,razorpay_order_id,status")
      .eq("idempotency_key",fallbackKey).maybeSingle();
    if(existingFallback)continue;

    let fallbackOrder;
    try {
      fallbackOrder=await getRazorpay().orders.create({
        amount:Math.round(Number(fallbackBid.amount)*100),
        currency:"INR",
        receipt:"ph_auction_"+auction.id+"_r2",
        notes:{auction_id:auction.id,user_id:fallbackBid.bidder_id,round:2}
      });
    } catch { continue; }

    const fallbackDeadline=new Date(Date.now()+15*60*1000).toISOString();
    const {data:newPayment,error:newPaymentError}=await admin.from("payments").insert({
      user_id:fallbackBid.bidder_id,
      project_id:fallbackProject.id,
      auction_id:auction.id,
      idempotency_key:fallbackKey,
      amount:Number(fallbackBid.amount),
      currency:"INR",
      plan:"homepage",
      status:"pending",
      payment_deadline_at:fallbackDeadline,
      auction_payment_round:2,
      razorpay_order_id:fallbackOrder.id,
      metadata:{
        purpose:"auction_winner_payment",
        idempotency_key:fallbackKey,
        claimant_id:fallbackBid.bidder_id,
        fallback_from_user_id:expiredClaim.user_id,
        previous_winning_bid:Number(auction.winning_bid??0)
      }
    }).select("id").single();
    if(newPaymentError||!newPayment)continue;

    await admin.from("auctions").update({
      winner_id:fallbackBid.bidder_id,
      winning_bid:fallbackBid.amount,
      winning_project_id:fallbackProject.id,
      project_id:fallbackProject.id,
      updated_at:now.toISOString()
    }).eq("id",auction.id).eq("status","settled").eq("winner_id",expiredClaim.user_id);

    await admin.from("payments").update({
      fallback_notified_at:now.toISOString()
    }).eq("id",newPayment.id);

    const {data:existingNotification}=await admin.from("notifications").select("id")
      .eq("user_id",fallbackBid.bidder_id).eq("type","auction_fallback_available")
      .eq("reference_type","auction").eq("reference_id",auction.id).maybeSingle();
    if(!existingNotification)await admin.from("notifications").insert({
      user_id:fallbackBid.bidder_id,
      type:"auction_fallback_available",
      title:"Auction placement is available",
      message:"The previous winner did not complete payment. You can now pay your winning bid within 15 minutes to claim the homepage placement.",
      link:"/projects/"+fallbackProject.slug,
      reference_type:"auction",
      reference_id:auction.id
    });
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
