import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpay } from "@/lib/payments/razorpay";
import { hasRazorpayEnv, hasSupabaseServerEnv } from "@/lib/utils";
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { serviceUnavailable } from "@/lib/api-response";

const schema=z.object({project_id:z.string().uuid()});

export async function POST(request:Request){
  if(!hasSupabaseServerEnv) return serviceUnavailable("Payment backend is not configured yet.");
  if(!hasRazorpayEnv) return serviceUnavailable("Razorpay is not configured yet.");
  const idempotencyKey=request.headers.get("x-idempotency-key")?.trim()||randomUUID();
  if(idempotencyKey.length<8||idempotencyKey.length>128)
    return NextResponse.json({error:"Invalid idempotency key."},{status:400});
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const admin=createAdminClient();
  if(!await consumeRateLimit(admin,"payment-order:"+user.id,{limit:5,windowSeconds:600,failClosed:true})) return rateLimitResponse();
  const parsed=schema.safeParse(await request.json().catch(()=>({})));
  if(!parsed.success)return NextResponse.json({error:"Invalid project."},{status:400});
  const {data:project}=await supabase.from("projects").select("id,name").eq("id",parsed.data.project_id).eq("owner_id",user.id).eq("status","published").maybeSingle();
  if(!project)return NextResponse.json({error:"Project not found or not published."},{status:404});
  const {data:setting}=await supabase.from("settings").select("value").eq("key","featured_promotion_price").single();
  const amount=Number(setting?.value??999);
  if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:"Featured price is not configured."},{status:500});
  const {data:existingPayment}=await admin.from("payments")
    .select("id,razorpay_order_id,amount,currency,promotion_id,status")
    .eq("user_id",user.id).eq("idempotency_key",idempotencyKey).maybeSingle();
  if(existingPayment){
    if(existingPayment.razorpay_order_id) return NextResponse.json({
      order_id:existingPayment.razorpay_order_id,
      amount:Math.round(Number(existingPayment.amount)*100),
      currency:existingPayment.currency,
      key_id:process.env.RAZORPAY_KEY_ID,
      promotion_id:existingPayment.promotion_id
    });
    return NextResponse.json({error:"This payment attempt is already being processed. Please wait a moment and retry."},{status:409});
  }
  const {data:type}=await admin.from("promotion_types").select("default_duration_days").eq("slug","featured").single();
  if(!type)return NextResponse.json({error:"Promotion configuration is incomplete."},{status:500});
  const {data:reservation,error:reservationError}=await admin.rpc("reserve_featured_promotion_for_payment",{
    p_project_id:project.id,
    p_user_id:user.id,
    p_amount:Math.round(amount),
    p_duration_days:Number(type.default_duration_days),
    p_reservation_minutes:15
  });
  const promotion=Array.isArray(reservation)?reservation[0]:reservation;
  if(reservationError){
    if(reservationError.message.includes("FEATURED_FULL"))
      return NextResponse.json({error:"All 5 Featured slots on Explore are currently occupied. Please try again when a slot opens."},{status:409});
    if(reservationError.message.includes("PROJECT_ALREADY_PROMOTED"))
      return NextResponse.json({error:"This project already has an active or pending Featured promotion."},{status:409});
    if(reservationError.message.includes("PROMOTION_NOT_ALLOWED"))
      return NextResponse.json({error:"Promotion is not allowed for this account."},{status:403});
    if(reservationError.message.includes("PROJECT_NOT_ELIGIBLE"))
      return NextResponse.json({error:"Project not found or not published."},{status:404});
    return NextResponse.json({error:"Could not reserve a Featured slot."},{status:500});
  }
  if(!promotion?.promotion_id)return NextResponse.json({error:"Could not create promotion."},{status:500});
  const {data:paymentIntent,error:paymentIntentError}=await admin.from("payments").insert({
    user_id:user.id,project_id:project.id,promotion_id:promotion.promotion_id,
    plan:"featured",provider:"razorpay",idempotency_key:idempotencyKey,amount,currency:"INR",status:"pending",
    metadata:{purpose:"featured_promotion",idempotency_key:idempotencyKey}
  }).select("id").single();
  if(paymentIntentError||!paymentIntent){
    console.error("Featured payment intent creation failed",paymentIntentError);
    await admin.from("promotions").update({status:"cancelled"}).eq("id",promotion.promotion_id);
    const {data:racePayment}=await admin.from("payments")
      .select("id,razorpay_order_id,amount,currency,promotion_id").eq("user_id",user.id)
      .eq("idempotency_key",idempotencyKey).maybeSingle();
    if(racePayment?.razorpay_order_id) return NextResponse.json({
      order_id:racePayment.razorpay_order_id,amount:Math.round(Number(racePayment.amount)*100),
      currency:racePayment.currency,key_id:process.env.RAZORPAY_KEY_ID,promotion_id:racePayment.promotion_id
    });
    return NextResponse.json({error:"Could not start payment safely. Please try again."},{status:500});
  }

  let order;
  try {
    order=await getRazorpay().orders.create({
      amount:Math.round(amount*100),currency:"INR",receipt:"ph_"+promotion.promotion_id,
      notes:{promotion_id:promotion.promotion_id,project_id:project.id,user_id:user.id}
    });
  } catch {
    await admin.from("payments").update({status:"failed",metadata:{purpose:"featured_promotion",idempotency_key:idempotencyKey,error:"razorpay_order_creation_failed"}}).eq("id",paymentIntent.id);
    await admin.from("promotions").update({status:"cancelled"}).eq("id",promotion.promotion_id);
    return NextResponse.json({error:"Could not create payment order."},{status:502});
  }

  const {error:paymentUpdateError}=await admin.from("payments").update({
    razorpay_order_id:order.id,updated_at:new Date().toISOString()
  }).eq("id",paymentIntent.id);
  if(paymentUpdateError){
    return NextResponse.json({error:"Could not record payment order."},{status:500});
  }
  return NextResponse.json({order_id:order.id,amount:order.amount,currency:order.currency,key_id:process.env.RAZORPAY_KEY_ID,promotion_id:promotion.promotion_id});
}
