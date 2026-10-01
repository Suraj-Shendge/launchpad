import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRazorpay } from "@/lib/payments/razorpay";
import { hasRazorpayEnv, hasSupabaseServerEnv } from "@/lib/utils";
import { serviceUnavailable } from "@/lib/api-response";

const schema=z.object({project_id:z.string().uuid()});

export async function POST(request:Request){
  if(!hasSupabaseServerEnv) return serviceUnavailable("Payment backend is not configured yet.");
  if(!hasRazorpayEnv) return serviceUnavailable("Razorpay is not configured yet.");
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>({})));
  if(!parsed.success)return NextResponse.json({error:"Invalid project."},{status:400});
  const {data:project}=await supabase.from("projects").select("id,name").eq("id",parsed.data.project_id).eq("owner_id",user.id).eq("status","published").maybeSingle();
  if(!project)return NextResponse.json({error:"Project not found or not published."},{status:404});
  const {data:setting}=await supabase.from("settings").select("value").eq("key","featured_promotion_price").single();
  const amount=Number(setting?.value??999);
  if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:"Featured price is not configured."},{status:500});
  const admin=createAdminClient();
  const {data:type}=await admin.from("promotion_types").select("id,default_duration_days").eq("slug","featured").single();
  const {data:position}=await admin.from("promotion_positions").select("id").eq("slug","explore-featured").single();
  if(!type||!position)return NextResponse.json({error:"Promotion configuration is incomplete."},{status:500});
  const {data:promotion,error:promotionError}=await admin.from("promotions").insert({
    project_id:project.id,user_id:user.id,type_id:type.id,position_id:position.id,amount,
    duration_days:type.default_duration_days,status:"pending"
  }).select("id").single();
  if(promotionError||!promotion)return NextResponse.json({error:"Could not create promotion."},{status:500});
  const order=await getRazorpay().orders.create({
    amount:Math.round(amount*100),currency:"INR",receipt:"ph_"+promotion.id,
    notes:{promotion_id:promotion.id,project_id:project.id,user_id:user.id}
  });
  const {error:paymentError}=await admin.from("payments").insert({
    user_id:user.id,project_id:project.id,promotion_id:promotion.id,
    razorpay_order_id:order.id,amount,currency:"INR",status:"pending",
    metadata:{purpose:"featured_promotion"}
  });
  if(paymentError)return NextResponse.json({error:"Could not record payment order."},{status:500});
  return NextResponse.json({order_id:order.id,amount:order.amount,currency:order.currency,key_id:process.env.RAZORPAY_KEY_ID,promotion_id:promotion.id});
}