import type { SupabaseClient } from "@supabase/supabase-js";

export async function finalizePayment(
  admin:SupabaseClient,
  paymentId:string,
  razorpayPaymentId?:string
){
  const {data:payment}=await admin.from("payments")
    .select("id,user_id,promotion_id,auction_id,status,amount,razorpay_payment_id")
    .eq("id",paymentId).maybeSingle();
  if(!payment)return {ok:false,reason:"payment_not_found"};
  if(payment.status==="refunded")return {ok:true,reason:"payment_already_refunded"};

  if(payment.status==="paid"){
    if(razorpayPaymentId&&!payment.razorpay_payment_id){
      const {error}=await admin.from("payments").update({razorpay_payment_id:razorpayPaymentId,updated_at:new Date().toISOString()}).eq("id",payment.id).is("razorpay_payment_id",null);
      if(error)return {ok:false,reason:"payment_update_failed"};
    }
  } else {
    const {error}=await admin.from("payments").update({
      status:"paid",
      ...(razorpayPaymentId?{razorpay_payment_id:razorpayPaymentId}:{}),
      updated_at:new Date().toISOString(),
    }).eq("id",payment.id).neq("status","refunded").neq("status","paid");
    if(error)return {ok:false,reason:"payment_update_failed"};
  }

  if(payment.promotion_id){
    const {data:promotion}=await admin.from("promotions")
      .select("id,duration_days,status").eq("id",payment.promotion_id).maybeSingle();
    if(promotion&&["pending","scheduled"].includes(promotion.status)){
      const start=new Date();
      const end=new Date(start.getTime()+Number(promotion.duration_days)*86400000);
      const {data:activated,error:activationError}=await admin.from("promotions").update({
        status:"active",starts_at:start.toISOString(),ends_at:end.toISOString(),updated_at:new Date().toISOString()
      }).eq("id",promotion.id).in("status",["pending","scheduled"]).select("id").maybeSingle();
      if(activationError)return {ok:false,reason:"promotion_activation_failed"};
      if(activated) await admin.from("notifications").insert({
        user_id:payment.user_id,
        type:"promotion_activated",
        title:"Promotion activated",
        body:"Your featured project promotion is now active.",
        data:{promotion_id:promotion.id}
      });
    }
  }

  if(payment.auction_id){
    const {data:auction}=await admin.from("auctions")
      .select("id,project_id,position_id,winner_id,winning_bid,status,homepage_slot,winning_project_id,ends_at")
      .eq("id",payment.auction_id).maybeSingle();

    if(!auction)return {ok:true};

    if(auction.winner_id===payment.user_id&&auction.status==="settled"){
      const {data:settings}=await admin.from("settings")
        .select("value").eq("key","homepage_promotion_duration_days").maybeSingle();
      const duration=Number(settings?.value??3);
      let winningProjectId=auction.winning_project_id??auction.project_id;
      if(!winningProjectId){
        const {data:winningBid}=await admin.from("auction_bids").select("project_id").eq("auction_id",auction.id).order("amount",{ascending:false}).order("created_at",{ascending:true}).limit(1).maybeSingle();
        winningProjectId=winningBid?.project_id??null;
      }
      if(!winningProjectId)return {ok:true};

      const {data:existing}=await admin.from("promotions")
        .select("id").eq("project_id",winningProjectId)
        .eq("user_id",payment.user_id)
        .eq("position_id",auction.position_id)
        .eq("homepage_slot",auction.homepage_slot)
        .in("status",["active","scheduled"]).maybeSingle();

      if(!existing){
        const {data:type}=await admin.from("promotion_types")
          .select("id").eq("slug","featured").maybeSingle();
        if(type){
          const start=new Date(Math.max(Date.now(),new Date(auction.ends_at).getTime()));
          const end=new Date(start.getTime()+duration*86400000);
          const {data:createdPromotion}=await admin.from("promotions").insert({
            project_id:winningProjectId,
            user_id:payment.user_id,
            type_id:type.id,
            position_id:auction.position_id,
            homepage_slot:auction.homepage_slot,
            amount:Number(auction.winning_bid??payment.amount),
            duration_days:duration,
            status:"active",
            starts_at:start.toISOString(),
            ends_at:end.toISOString()
          }).select("id").single();
          if(createdPromotion&&auction.homepage_slot){
            await admin.from("homepage_slots").update({active_promotion_id:createdPromotion.id}).eq("slot_number",auction.homepage_slot);
          }
        }
      }

      const {data:existingNotification}=await admin.from("notifications").select("id")
        .eq("user_id",payment.user_id).eq("type","auction_won")
        .contains("data",{auction_id:auction.id}).maybeSingle();
      if(!existingNotification) await admin.from("notifications").insert({
        user_id:payment.user_id,
        type:"auction_won",
        title:"Auction won",
        body:"Your homepage placement payment was verified and the placement is active.",
        data:{auction_id:auction.id}
      });
    }
  }

  return {ok:true};
}
