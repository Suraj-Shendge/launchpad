import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit,rateLimitResponse } from "@/lib/rate-limit";
import { hasSupabaseServerEnv } from "@/lib/utils";
import { serviceUnavailable } from "@/lib/api-response";
import { createDodoTestCheckout,isDodoSelected,isDodoTestSetupReady } from "@/lib/payments/dodo";
import { getSiteUrl } from "@/lib/site-url";
const schema=z.object({payment_id:z.string().uuid()});
export async function POST(request:Request){
 if(!hasSupabaseServerEnv)return serviceUnavailable("Payment backend is not configured yet.");
 if(!isDodoSelected()||!isDodoTestSetupReady())return serviceUnavailable("Dodo auction checkout is available only in isolated test mode.");
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const parsed=schema.safeParse(await request.json().catch(()=>({})));if(!parsed.success)return NextResponse.json({error:"Invalid auction payment."},{status:400});
 const admin=createAdminClient();if(!await consumeRateLimit(admin,"auction-dodo-checkout:"+user.id,{limit:5,windowSeconds:600,failClosed:true}))return rateLimitResponse();
 const {data:payment}=await admin.from("payments").select("id,user_id,project_id,auction_id,amount,status,payment_deadline_at,provider").eq("id",parsed.data.payment_id).eq("user_id",user.id).eq("provider","dodo").eq("status","pending").not("auction_id","is",null).gt("payment_deadline_at",new Date().toISOString()).maybeSingle();
 if(!payment)return NextResponse.json({error:"Auction payment was not found or its 15-minute payment window has expired."},{status:409});
 const {data:project}=await admin.from("projects").select("id,slug").eq("id",payment.project_id).maybeSingle();if(!project?.slug)return NextResponse.json({error:"Winning project could not be found."},{status:404});
 let session;try{session=await createDodoTestCheckout({productId:process.env.DODO_PAYMENTS_TEST_PRODUCT_ID!,amount:Number(payment.amount),customer:{email:user.email||""},metadata:{projecthub_payment_id:payment.id,projecthub_user_id:user.id,purpose:"auction_winner_payment",auction_id:payment.auction_id!,project_id:project.id},returnUrl:getSiteUrl()+"/projects/"+project.slug+"?payment_return=dodo"});}catch{return NextResponse.json({error:"Could not create Dodo test checkout. Check the Pay What You Want test product and credentials."},{status:502});}
 const {data:current}=await admin.from("payments").select("metadata").eq("id",payment.id).maybeSingle();const oldMetadata=current?.metadata&&typeof current.metadata==="object"?current.metadata as Record<string,unknown>:{};
 const {error}=await admin.from("payments").update({provider_order_id:session.sessionId,metadata:{...oldMetadata,dodo_checkout_session_id:session.sessionId,dodo_checkout_url:session.checkoutUrl},updated_at:new Date().toISOString()}).eq("id",payment.id).eq("status","pending");
 if(error)return NextResponse.json({error:"Could not record Dodo checkout session."},{status:500});return NextResponse.json({provider:"dodo",checkout_url:session.checkoutUrl});
}
