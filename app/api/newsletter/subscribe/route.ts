import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscribeToNewsletter } from "@/lib/newsletter/service";
import { hashToken } from "@/lib/newsletter/utils";

export async function POST(request:Request){
 try{
  const body=await request.json().catch(()=>({}));
  const email=typeof body.email==="string"?body.email:"";
  const ip=(request.headers.get("x-forwarded-for")||request.headers.get("x-real-ip")||"unknown").split(",")[0].trim();
  const bucket=Math.floor(Date.now()/600000);
  const keyHash=hashToken(ip+"|"+bucket);
  const db=createAdminClient();
  const {data:allowed,error:rateError}=await db.rpc("consume_newsletter_signup_rate_limit",{p_key_hash:keyHash,p_limit:5,p_window_seconds:600});
  if(rateError)throw new Error("Could not validate subscription request.");
  if(!allowed)return NextResponse.json({error:"Too many signup attempts. Please try again later."},{status:429});
  const origin=new URL(request.url).origin;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const result=await subscribeToNewsletter({email,userId:user?.id||null,origin});
  return NextResponse.json({ok:true,alreadySubscribed:result.alreadySubscribed});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not subscribe."},{status:400});}
}
