import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseServerEnv } from "@/lib/utils";
import { serviceUnavailable } from "@/lib/api-response";
import { isDodoSelected,isDodoTestSetupReady,verifyDodoTestWebhook } from "@/lib/payments/dodo";
import { finalizePayment } from "@/lib/payments/finalize";

type DodoEvent={type?:string;data?:Record<string,unknown>};
function eventMetadata(data:Record<string,unknown>){const m=data.metadata;return m&&typeof m==="object"&&!Array.isArray(m)?m as Record<string,unknown>:{};}
export async function POST(request:Request){
 if(!hasSupabaseServerEnv)return serviceUnavailable("Payment webhook backend is not configured yet.");
 if(!isDodoSelected()||!isDodoTestSetupReady())return serviceUnavailable("Dodo webhook processing is test-mode-only and requires isolated staging data.");
 const id=request.headers.get("webhook-id")||"",signature=request.headers.get("webhook-signature")||"",timestamp=request.headers.get("webhook-timestamp")||"";
 if(!id||!signature||!timestamp)return NextResponse.json({error:"Missing Dodo webhook headers."},{status:400});
 const body=await request.text();let event:DodoEvent;
 try{await verifyDodoTestWebhook(body,{"webhook-id":id,"webhook-signature":signature,"webhook-timestamp":timestamp});event=JSON.parse(body) as DodoEvent;}
 catch{return NextResponse.json({error:"Invalid Dodo webhook signature or payload."},{status:400});}
 const admin=createAdminClient();
 const {data:created,error:insertError}=await admin.from("payment_events").insert({provider:"dodo",event_id:id,payload:event}).select("id").single();
 let eventRecord:{id:string;payment_id?:string|null}|null=created as {id:string;payment_id?:string|null}|null;
 if(insertError?.code==="23505"){const {data:prior}=await admin.from("payment_events").select("id,payment_id").eq("event_id",id).maybeSingle();if(prior?.payment_id)return NextResponse.json({ok:true,duplicate:true});eventRecord=prior as {id:string;payment_id?:string|null}|null;}
 else if(insertError||!created)return NextResponse.json({error:"Could not record Dodo webhook event."},{status:500});
 const data=event.data||{},metadata=eventMetadata(data),providerPaymentId=typeof data.payment_id==="string"?data.payment_id:"",linkId=typeof metadata.projecthub_payment_id==="string"?metadata.projecthub_payment_id:"";
 type Payment={id:string;status:string;provider:string|null;amount:number;currency:string;provider_payment_id:string|null;promotion_id:string|null;auction_id:string|null};
 let payment:Payment|null=null;
 if(linkId){const {data:row}=await admin.from("payments").select("id,status,provider,amount,currency,provider_payment_id,promotion_id,auction_id").eq("id",linkId).eq("provider","dodo").maybeSingle();payment=row as Payment|null;}
 if(!payment&&providerPaymentId){const {data:row}=await admin.from("payments").select("id,status,provider,amount,currency,provider_payment_id,promotion_id,auction_id").eq("provider_payment_id",providerPaymentId).eq("provider","dodo").maybeSingle();payment=row as Payment|null;}
 if(!payment||!event.type||!["payment.succeeded","payment.failed","payment.cancelled","refund.succeeded"].includes(event.type)){if(eventRecord&&payment)await admin.from("payment_events").update({payment_id:payment.id}).eq("id",eventRecord.id);return NextResponse.json({ok:true});}
 if(event.type==="payment.succeeded"){
  const amount=Number(data.total_amount),tax=Number(data.tax??0),baseAmount=amount-tax,currency=String(data.currency||"").toUpperCase();
  // Dodo's total_amount includes tax. Compare the pre-tax amount to ProjectHub's
  // configured placement price, while still checking the full transaction is valid.
  if(!Number.isFinite(amount)||!Number.isFinite(tax)||tax<0||baseAmount!==Math.round(Number(payment.amount)*100)||currency!==String(payment.currency||"").toUpperCase()){console.error("Dodo webhook amount/currency mismatch",{paymentId:payment.id,eventId:id});return NextResponse.json({error:"Dodo amount or currency does not match payment intent."},{status:400});}
  const result=await finalizePayment(admin,payment.id,providerPaymentId||undefined);
  if(!result.ok)return NextResponse.json({error:"Verified Dodo payment could not be finalized.",reason:result.reason||"finalization_failed"},{status:409});
  if(eventRecord)await admin.from("payment_events").update({payment_id:payment.id}).eq("id",eventRecord.id);return NextResponse.json({ok:true});
 }
 if(event.type==="payment.failed"||event.type==="payment.cancelled"){
  if(payment.status!=="paid"&&payment.status!=="refunded"){
   const {error}=await admin.from("payments").update({status:"failed",provider_payment_id:providerPaymentId||payment.provider_payment_id,updated_at:new Date().toISOString()}).eq("id",payment.id).neq("status","paid").neq("status","refunded");
   if(error)return NextResponse.json({error:"Could not update failed Dodo payment."},{status:500});
   if(payment.promotion_id)await admin.from("promotions").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",payment.promotion_id).eq("status","pending");
  }
 }else if(event.type==="refund.succeeded"&&payment.status!=="refunded"){
  const {error}=await admin.from("payments").update({status:"refunded",provider_payment_id:providerPaymentId||payment.provider_payment_id,updated_at:new Date().toISOString()}).eq("id",payment.id).neq("status","refunded");
  if(error)return NextResponse.json({error:"Could not update refunded Dodo payment."},{status:500});
  if(payment.promotion_id){await admin.from("promotions").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",payment.promotion_id).in("status",["pending","active","scheduled"]);await admin.from("homepage_slots").update({active_promotion_id:null}).eq("active_promotion_id",payment.promotion_id);}
  if(payment.auction_id){const {data:auction}=await admin.from("auctions").select("position_id,homepage_slot,winning_project_id,project_id").eq("id",payment.auction_id).maybeSingle();const winningProjectId=auction?.winning_project_id??auction?.project_id;if(auction&&winningProjectId)await admin.from("promotions").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("project_id",winningProjectId).in("status",["active","scheduled"]);if(auction?.homepage_slot)await admin.from("homepage_slots").update({active_promotion_id:null}).eq("slot_number",auction.homepage_slot);}
 }
 if(eventRecord)await admin.from("payment_events").update({payment_id:payment.id}).eq("id",eventRecord.id);
 return NextResponse.json({ok:true});
}
