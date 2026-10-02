import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { finalizePayment } from "@/lib/payments/finalize";
import { hasRazorpayWebhookEnv, hasSupabaseServerEnv } from "@/lib/utils";
import { serviceUnavailable } from "@/lib/api-response";

export async function POST(request:Request){
  const body=await request.text();
  const signature=request.headers.get("x-razorpay-signature")||"";
  const eventId=request.headers.get("x-razorpay-event-id")||"";
  if(!signature||!eventId)return NextResponse.json({error:"Missing webhook headers."},{status:400});
  if(!hasSupabaseServerEnv||!hasRazorpayWebhookEnv) return serviceUnavailable("Payment webhook backend is not configured yet.");
  if(!verifyWebhookSignature(body,signature))return NextResponse.json({error:"Invalid webhook signature."},{status:400});
  let payload:any;
  try { payload=JSON.parse(body) as any; } catch { return NextResponse.json({error:"Invalid JSON payload."},{status:400}); }
  const admin=createAdminClient();
  const {data:eventRecord,error:insertError}=await admin.from("payment_events").insert({
    provider:"razorpay",event_id:eventId,payload
  }).select("id").single();
  if(insertError?.code==="23505")return NextResponse.json({ok:true});
  if(insertError||!eventRecord)return NextResponse.json({error:"Could not record webhook event."},{status:500});

  const paymentEntity=payload?.payload?.payment?.entity;
  const orderEntity=payload?.payload?.order?.entity;
  const orderId=paymentEntity?.order_id??orderEntity?.id;
  const paymentId=paymentEntity?.id;
  const status=payload.event==="payment.captured"||payload.event==="order.paid"?"paid"
    :payload.event==="payment.failed"?"failed"
    :payload.event==="payment.refunded"?"refunded":null;
  if(!orderId||!status)return NextResponse.json({ok:true});

  const {data:payment}=await admin.from("payments")
    .select("id,status,auction_id,payment_deadline_at").eq("razorpay_order_id",orderId).maybeSingle();
  if(!payment)return NextResponse.json({ok:true});
  await admin.from("payment_events").update({payment_id:payment.id}).eq("id",eventRecord.id);

  if(status==="paid"){
    if(payment.status!=="refunded") await finalizePayment(admin,payment.id,paymentId);
  } else if(status==="failed"){
    const auctionWindowOpen=Boolean(payment.auction_id&&payment.payment_deadline_at&&new Date(payment.payment_deadline_at).getTime()>Date.now());
    if(!auctionWindowOpen&&payment.status!=="paid"&&payment.status!=="refunded"){
      await admin.from("payments").update({status:"failed",updated_at:new Date().toISOString()})
        .eq("id",payment.id).neq("status","paid").neq("status","refunded");
    }
  } else if(status==="refunded"){
    if(payment.status!=="refunded"){
      await admin.from("payments").update({status:"refunded",updated_at:new Date().toISOString()})
        .eq("id",payment.id).neq("status","refunded");
      const {data:paymentDetail}=await admin.from("payments").select("user_id,promotion_id,auction_id").eq("id",payment.id).maybeSingle();
      if(paymentDetail?.promotion_id){
        await admin.from("promotions").update({status:"cancelled",updated_at:new Date().toISOString()})
          .eq("id",paymentDetail.promotion_id).in("status",["active","scheduled","pending"]);
        await admin.from("homepage_slots").update({active_promotion_id:null})
          .eq("active_promotion_id",paymentDetail.promotion_id);
      }
      if(paymentDetail?.auction_id){
        const {data:auction}=await admin.from("auctions").select("position_id,homepage_slot,winning_project_id,project_id").eq("id",paymentDetail.auction_id).maybeSingle();
        const winningProjectId=auction?.winning_project_id??auction?.project_id;
        if(auction&&winningProjectId){
          await admin.from("promotions").update({status:"cancelled",updated_at:new Date().toISOString()})
            .eq("project_id",winningProjectId).eq("user_id",paymentDetail.user_id)
            .eq("position_id",auction.position_id).eq("homepage_slot",auction.homepage_slot)
            .in("status",["active","scheduled"]);
          if(auction.homepage_slot) await admin.from("homepage_slots").update({active_promotion_id:null})
            .eq("slot_number",auction.homepage_slot);
        }
      }
      if(paymentDetail?.user_id){
        const {data:existingNotification}=await admin.from("notifications").select("id")
          .eq("user_id",paymentDetail.user_id).eq("type","payment_refunded")
          .eq("reference_type","payment").eq("reference_id",payment.id).maybeSingle();
        if(!existingNotification) await admin.from("notifications").insert({
          user_id:paymentDetail.user_id,
          type:"payment_refunded",
          title:"Payment refunded",
          message:"Your ProjectHub payment was refunded.",
          link:"/dashboard/payments",
          reference_type:"payment",
          reference_id:payment.id
        });
      }
    }
  }
  return NextResponse.json({ok:true});
}