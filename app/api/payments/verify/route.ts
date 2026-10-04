import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getRazorpay, verifyPaymentSignature } from "@/lib/payments/razorpay";
import { finalizePayment } from "@/lib/payments/finalize";
import { hasRazorpayEnv, hasSupabaseServerEnv } from "@/lib/utils";
import { serviceUnavailable } from "@/lib/api-response";

const schema=z.object({
  order_id:z.string().min(1),
  payment_id:z.string().min(1),
  signature:z.string().min(1)
});

export async function POST(request:Request){
  if(!hasSupabaseServerEnv) return serviceUnavailable("Payment backend is not configured yet.");
  if(!hasRazorpayEnv) return serviceUnavailable("Razorpay is not configured yet.");
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>({})));
  if(!parsed.success)return NextResponse.json({error:"Invalid payment verification payload."},{status:400});
  if(!verifyPaymentSignature(parsed.data.order_id,parsed.data.payment_id,parsed.data.signature))
    return NextResponse.json({error:"Payment signature is invalid."},{status:400});
  const admin=createAdminClient();
  if(!await consumeRateLimit(admin,"payment-verify:"+user.id,{limit:10,windowSeconds:600,failClosed:true}))
    return rateLimitResponse();

  const {data:payment}=await admin.from("payments")
    .select("id,user_id,status,amount,currency,razorpay_order_id").eq("razorpay_order_id",parsed.data.order_id)
    .eq("user_id",user.id).maybeSingle();
  if(!payment)return NextResponse.json({error:"Payment order not found."},{status:404});

  let gatewayPayment:any;
  try{
    gatewayPayment=await getRazorpay().payments.fetch(parsed.data.payment_id);
  }catch{
    return NextResponse.json({error:"Could not verify the payment with the payment provider."},{status:502});
  }
  if(gatewayPayment.order_id!==parsed.data.order_id)
    return NextResponse.json({error:"Payment does not belong to this order."},{status:400});
  if(Number(gatewayPayment.amount)!==Math.round(Number(payment.amount)*100))
    return NextResponse.json({error:"Payment amount does not match the order."},{status:400});
  if(String(gatewayPayment.currency||"").toUpperCase()!==String(payment.currency||"").toUpperCase())
    return NextResponse.json({error:"Payment currency does not match the order."},{status:400});
  if(gatewayPayment.status!=="captured")
    return NextResponse.json({error:"Payment has not been captured yet."},{status:409});

  const result=await finalizePayment(admin,payment.id,parsed.data.payment_id);
  if(!result.ok)return NextResponse.json({error:"Could not finalize verified payment."},{status:500});
  return NextResponse.json({ok:true});
}