import { NewsletterEmail } from "@/emails/newsletter";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNewsletterFrom, getResend } from "@/lib/resend";
import type { NewsletterContent } from "@/lib/newsletter/types";
import { NEWSLETTER_UNSUBSCRIBE_PROPERTY } from "@/lib/resend";

const SEGMENT_NAME="ProjectHub Newsletter Subscribers";

export async function getNewsletterSettings(){
 const db=createAdminClient();
 const {data}=await db.from("newsletter_settings").select("*").eq("id","default").maybeSingle();
 return data;
}

export async function ensureResendNewsletterInfra(){
 const resend=getResend(),db=createAdminClient();
 let settings=await getNewsletterSettings();
 let segmentId=settings?.resend_segment_id as string|null;
 if(!segmentId){
  const listed=await resend.segments.list({limit:100});
  if(listed.error)throw new Error(listed.error.message);
  segmentId=listed.data?.data?.find(x=>x.name===SEGMENT_NAME)?.id||null;
  if(!segmentId){const created=await resend.segments.create({name:SEGMENT_NAME});if(created.error||!created.data)throw new Error(created.error?.message||"Could not create newsletter segment.");segmentId=created.data.id;}
 }
 let propertyKey=settings?.resend_unsubscribe_property_key as string|null;
 if(propertyKey!==NEWSLETTER_UNSUBSCRIBE_PROPERTY){
  const props=await resend.contactProperties.list({limit:100});
  if(props.error)throw new Error(props.error.message);
  if(!props.data?.data?.some(x=>x.key===NEWSLETTER_UNSUBSCRIBE_PROPERTY)){const created=await resend.contactProperties.create({key:NEWSLETTER_UNSUBSCRIBE_PROPERTY,type:"string"});if(created.error)throw new Error(created.error.message);}
  propertyKey=NEWSLETTER_UNSUBSCRIBE_PROPERTY;
 }
 const {data:updated,error}=await db.from("newsletter_settings").update({resend_segment_id:segmentId,resend_unsubscribe_property_key:propertyKey}).eq("id","default").select("*").single();
 if(error||!updated)throw new Error(error?.message||"Could not save newsletter provider settings.");
 settings=updated;
 return settings;
}

export async function syncSubscriberToResend(email:string,unsubscribeUrl:string,firstName?:string|null){
 const resend=getResend(),settings=await ensureResendNewsletterInfra();
 const existing=await resend.contacts.get({email});
 if(existing.error?.statusCode===404||!existing.data){
  const created=await resend.contacts.create({email,firstName:firstName||undefined,unsubscribed:false,properties:{[NEWSLETTER_UNSUBSCRIBE_PROPERTY]:unsubscribeUrl},segments:[{id:settings.resend_segment_id}]});
  if(created.error||!created.data)throw new Error(created.error?.message||"Could not create newsletter contact.");
  return created.data.id;
 }
 const updated=await resend.contacts.update({email,firstName:firstName||undefined,unsubscribed:false,properties:{[NEWSLETTER_UNSUBSCRIBE_PROPERTY]:unsubscribeUrl}});
 if(updated.error)throw new Error(updated.error.message);
 const membership=await resend.contacts.segments.add({email,segmentId:settings.resend_segment_id});
 if(membership.error&&!/already|exist/i.test(membership.error.message||""))throw new Error(membership.error.message);
 return existing.data.id;
}

export async function removeSubscriberFromResend(email:string){
 const resend=getResend(),settings=await getNewsletterSettings();
 if(!settings?.resend_segment_id)return;
 const removed=await resend.contacts.segments.remove({email,segmentId:settings.resend_segment_id});
 if(removed.error&&removed.error.statusCode!==404&&!/not found|does not exist/i.test(removed.error.message||""))throw new Error(removed.error.message);
 const updated=await resend.contacts.update({email,unsubscribed:true});
 if(updated.error&&updated.error.statusCode!==404)throw new Error(updated.error.message);
}

export async function createNewsletterBroadcast(input:{editionId:string;title:string;subject:string;previewText?:string|null;content:NewsletterContent;scheduledAt?:string|null;slug:string;siteUrl:string}){
 const resend=getResend(),settings=await ensureResendNewsletterInfra(),siteUrl=input.siteUrl.replace(/\/$/,"");
 const unsubscribeUrl=siteUrl+"/newsletter/unsubscribe?token={{{"+NEWSLETTER_UNSUBSCRIBE_PROPERTY+"}}}";
 const result=await resend.broadcasts.create({
  name:"ProjectHub — "+input.title,segmentId:settings.resend_segment_id,from:getNewsletterFrom(settings.from_email),subject:input.subject,previewText:input.previewText||undefined,
  react:NewsletterEmail({title:input.title,subject:input.subject,content:input.content,archiveUrl:siteUrl+"/newsletter/"+input.slug,unsubscribeUrl,siteUrl}),
  send:true,scheduledAt:input.scheduledAt||undefined
 });
 if(result.error||!result.data)throw new Error(result.error?.message||"Could not create newsletter broadcast.");
 return result.data.id;
}

export async function sendNewsletterTest(input:{to:string;title:string;subject:string;content:NewsletterContent;slug:string;siteUrl:string}){
 const siteUrl=input.siteUrl.replace(/\/$/,"");
 const result=await getResend().emails.send({from:getNewsletterFrom(),to:input.to,subject:"[TEST] "+input.subject,react:NewsletterEmail({title:input.title,subject:input.subject,content:input.content,archiveUrl:siteUrl+"/newsletter/"+input.slug,unsubscribeUrl:siteUrl+"/newsletter",siteUrl}),tags:[{name:"newsletter_test",value:"true"}]});
 if(result.error||!result.data)throw new Error(result.error?.message||"Could not send test newsletter.");
 return result.data.id;
}

export async function cancelNewsletterBroadcast(id:string){const result=await getResend().broadcasts.cancel(id);if(result.error)throw new Error(result.error.message);}

export async function getNewsletterBroadcast(id:string){const result=await getResend().broadcasts.get(id);if(result.error||!result.data)throw new Error(result.error?.message||"Could not retrieve newsletter broadcast.");return result.data;}

async function countBroadcastRecipients(id:string,type:"sent"|"delivered"|"opened"|"clicked"|"bounced"|"unsubscribed"|"suppressed"){
 let total=0,after:string|undefined;
 for(let page=0;page<100;page++){const result=await getResend().broadcasts.recipients(id,{type,limit:100,after});if(result.error)throw new Error(result.error.message);const rows=result.data?.data||[];total+=rows.length;if(!result.data?.has_more||!rows.length)break;after=rows[rows.length-1].id;}
 return total;
}

export async function getNewsletterAnalytics(id:string){
 const [sent,delivered,opened,clicked,bounced,unsubscribed,suppressed]=await Promise.all([
  countBroadcastRecipients(id,"sent"),countBroadcastRecipients(id,"delivered"),countBroadcastRecipients(id,"opened"),countBroadcastRecipients(id,"clicked"),
  countBroadcastRecipients(id,"bounced"),countBroadcastRecipients(id,"unsubscribed"),countBroadcastRecipients(id,"suppressed")
 ]);
 return {sent,delivered,opened,clicked,bounced,unsubscribed,suppressed};
}
