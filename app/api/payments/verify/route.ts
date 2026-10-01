import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentSignature } from "@/lib/payments/razorpay";
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
  const {data:payment}=await admin.from("payments")
    .select("id,user_id,status").eq("razorpay_order_id",parsed.data.order_id)
    .eq("user_id",user.id).maybeSingle();
  if(!payment)return NextResponse.json({error:"Payment order not found."},{status:404});
  const result=await finalizePayment(admin,payment.id,parsed.data.payment_id);
  if(!result.ok)return NextResponse.json({error:"Could not finalize verified payment."},{status:500});
  return NextResponse.json({ok:true});
}