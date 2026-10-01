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
  const {error:insertError}=await admin.from("payment_events").insert({
    provider:"razorpay",event_id:eventId,payload
  });
  if(insertError?.code==="23505")return NextResponse.json({ok:true});
  if(insertError)return NextResponse.json({error:"Could not record webhook event."},{status:500});

  const paymentEntity=payload?.payload?.payment?.entity;
  const orderEntity=payload?.payload?.order?.entity;
  const orderId=paymentEntity?.order_id??orderEntity?.id;
  const paymentId=paymentEntity?.id;
  const status=payload.event==="payment.captured"||payload.event==="order.paid"?"paid"
    :payload.event==="payment.failed"?"failed":null;
  if(!orderId||!status)return NextResponse.json({ok:true});

  const {data:payment}=await admin.from("payments")
    .select("id,status").eq("razorpay_order_id",orderId).maybeSingle();
  if(!payment)return NextResponse.json({ok:true});
  if(status==="paid"){
    await finalizePayment(admin,payment.id,paymentId);
  } else {
    await admin.from("payments").update({status:"failed"}).eq("id",payment.id);
  }
  return NextResponse.json({ok:true});
}