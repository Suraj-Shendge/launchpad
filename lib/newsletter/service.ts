import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, getNewsletterFrom } from "@/lib/resend";
import { NewsletterConfirmEmail } from "@/emails/newsletter-confirm";
import { hashToken, normalizeEmail, createToken } from "@/lib/newsletter/utils";
import { syncSubscriberToResend, removeSubscriberFromResend } from "@/lib/newsletter/provider";

const CONFIRM_TTL_MS=48*60*60*1000;

export async function subscribeToNewsletter(input:{email:string;userId?:string|null;origin:string}){
  const db=createAdminClient(), email=normalizeEmail(input.email);
  if(!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
  const now=new Date(), token=createToken(), tokenHash=hashToken(token), unsubscribeToken=createToken();
  const confirmationUrl=input.origin+"/newsletter/confirm?token="+encodeURIComponent(token);
  const existing=await db.from("newsletter_subscribers").select("id,status,user_id").eq("normalized_email",email).maybeSingle();
  let id:string;
  if(existing.data){
    id=existing.data.id;
    if(existing.data.status==="subscribed"){
      if(input.userId && !existing.data.user_id) await db.from("newsletter_subscribers").update({user_id:input.userId}).eq("id",id);
      return {ok:true,alreadySubscribed:true};
    }
    const {error}=await db.from("newsletter_subscribers").update({
      email,user_id:input.userId||existing.data.user_id||null,status:"pending",confirmation_token_hash:tokenHash,
      confirmation_expires_at:new Date(now.getTime()+CONFIRM_TTL_MS).toISOString(),confirmation_sent_at:now.toISOString(),
      confirmed_at:null,unsubscribed_at:null,unsubscribe_token_hash:hashToken(unsubscribeToken),updated_at:now.toISOString()
    }).eq("id",id);
    if(error) throw new Error(error.message);
  }else{
    const {data,error}=await db.from("newsletter_subscribers").insert({
      email,normalized_email:email,user_id:input.userId||null,status:"pending",confirmation_token_hash:tokenHash,
      confirmation_expires_at:new Date(now.getTime()+CONFIRM_TTL_MS).toISOString(),confirmation_sent_at:now.toISOString(),
      unsubscribe_token_hash:hashToken(unsubscribeToken)
    }).select("id").single();
    if(error||!data) throw new Error(error?.message||"Could not create newsletter subscription.");
    id=data.id;
  }
  const result=await getResend().emails.send({
    from:getNewsletterFrom(),to:email,subject:"Confirm your ProjectHub Newsletter subscription",
    react:NewsletterConfirmEmail({confirmationUrl}),tags:[{name:"newsletter_confirmation",value:id}]
  });
  if(result.error) throw new Error(result.error.message);
  return {ok:true,alreadySubscribed:false};
}

export async function confirmNewsletterSubscription(token:string,siteUrl:string){
  const db=createAdminClient(), tokenHash=hashToken(token);
  const {data:subscriber}=await db.from("newsletter_subscribers").select("*").eq("confirmation_token_hash",tokenHash).maybeSingle();
  if(!subscriber) throw new Error("This confirmation link is invalid or has expired.");
  if(subscriber.status==="subscribed") return {ok:true,alreadyConfirmed:true};
  if(!subscriber.confirmation_expires_at||new Date(subscriber.confirmation_expires_at)<=new Date()) throw new Error("This confirmation link has expired. Please subscribe again.");
  const unsubscribeToken=createToken();
  const {error}=await db.from("newsletter_subscribers").update({
    status:"subscribed",confirmed_at:new Date().toISOString(),confirmation_token_hash:null,confirmation_expires_at:null,
    unsubscribe_token_hash:hashToken(unsubscribeToken),updated_at:new Date().toISOString()
  }).eq("id",subscriber.id);
  if(error) throw new Error(error.message);
  const unsubscribeUrl=siteUrl+"/newsletter/unsubscribe?token="+encodeURIComponent(unsubscribeToken);
  try{
    const providerContactId=await syncSubscriberToResend(subscriber.email,unsubscribeUrl);
    await db.from("newsletter_subscribers").update({provider_contact_id:providerContactId}).eq("id",subscriber.id);
  }catch(error){
    await db.from("newsletter_subscribers").update({status:"pending",confirmed_at:null}).eq("id",subscriber.id);
    throw error;
  }
  return {ok:true,alreadyConfirmed:false};
}

export async function unsubscribeFromNewsletter(token:string){
  const db=createAdminClient(), tokenHash=hashToken(token);
  const {data:subscriber}=await db.from("newsletter_subscribers").select("id,email,status").eq("unsubscribe_token_hash",tokenHash).maybeSingle();
  if(!subscriber) throw new Error("This unsubscribe link is invalid.");
  if(subscriber.status!=="unsubscribed"){
    const {error}=await db.from("newsletter_subscribers").update({status:"unsubscribed",unsubscribed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",subscriber.id);
    if(error) throw new Error(error.message);
  }
  try{await removeSubscriberFromResend(subscriber.email);}catch{}
  return {ok:true,alreadyUnsubscribed:subscriber.status==="unsubscribed"};
}

export async function getNewsletterSubscription(userId:string){
  const db=createAdminClient();
  const {data}=await db.from("newsletter_subscribers").select("id,email,status,confirmed_at,unsubscribed_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(1).maybeSingle();
  return data;
}

export async function unsubscribeUserFromNewsletter(userId:string){
 const db=createAdminClient();
 const {data:subscriber}=await db.from("newsletter_subscribers").select("id,email,status").eq("user_id",userId).eq("status","subscribed").maybeSingle();
 if(!subscriber)return;
 const {error}=await db.from("newsletter_subscribers").update({status:"unsubscribed",unsubscribed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",subscriber.id);
 if(error)throw new Error(error.message);
 try{await removeSubscriberFromResend(subscriber.email);}catch{}
}
