import { createAdminClient } from "@/lib/supabase/admin";
import { createNewsletterBroadcast, cancelNewsletterBroadcast, getNewsletterAnalytics, sendNewsletterTest } from "@/lib/newsletter/provider";
import { slugify } from "@/lib/newsletter/utils";
import type { NewsletterContent, NewsletterEditionType } from "@/lib/newsletter/types";

const DEFAULT_CONTENT:NewsletterContent={
  version:1,
  blocks:[
    {id:"hero-1",type:"hero",eyebrow:"ProjectHub Newsletter",title:"What’s new this week.",body:"A curated look at projects, makers and community conversations worth your attention.",ctaLabel:"Explore ProjectHub",ctaUrl:"/explore"},
    {id:"projects-1",type:"projects",heading:"Featured projects",items:[]},
    {id:"community-1",type:"community",heading:"From the community",items:[]}
  ]
};

export async function listNewsletterEditions(){
  const db=createAdminClient();
  const [{data:editions},{count:subscribers},{count:confirmed}]=await Promise.all([
    db.from("newsletter_editions").select("id,type,title,slug,subject,preview_text,status,scheduled_at,sent_at,provider_broadcast_id,provider_status,recipient_count,last_error,created_at,updated_at").order("created_at",{ascending:false}).limit(100),
    db.from("newsletter_subscribers").select("id",{count:"exact",head:true}),
    db.from("newsletter_subscribers").select("id",{count:"exact",head:true}).eq("status","subscribed")
  ]);
  return {editions:editions??[],subscriberCount:subscribers??0,confirmedSubscriberCount:confirmed??0};
}

export async function createNewsletterEdition(input:{adminId:string;type:NewsletterEditionType;title:string;subject?:string;previewText?:string}){
  const db=createAdminClient();
  const title=input.title.trim()||"ProjectHub Newsletter";
  const baseSlug=slugify(title);
  const slug=baseSlug+"-"+Date.now().toString(36).slice(-6);
  const {data,error}=await db.from("newsletter_editions").insert({
    type:input.type,title,slug,subject:input.subject?.trim()||title,
    preview_text:input.previewText?.trim()||null,content:DEFAULT_CONTENT,status:"draft",
    created_by:input.adminId,updated_by:input.adminId
  }).select("*").single();
  if(error||!data) throw new Error(error?.message||"Could not create newsletter edition.");
  await audit(input.adminId,"newsletter_created",data.id,{type:input.type,title:data.title});
  return data;
}
export async function getNewsletterEdition(id:string){
  const db=createAdminClient();
  const {data,error}=await db.from("newsletter_editions").select("*").eq("id",id).maybeSingle();
  if(error||!data) throw new Error(error?.message||"Newsletter edition not found.");
  return data;
}

export async function updateNewsletterEdition(id:string,input:{adminId:string;title?:string;type?:NewsletterEditionType;subject?:string;previewText?:string|null;content?:NewsletterContent;scheduledAt?:string|null;siteUrl?:string}){
  const current=await getNewsletterEdition(id);
  if(current.status==="sent") throw new Error("Sent newsletter editions are immutable.");
  const nextTitle=input.title!==undefined?(input.title.trim()||current.title):current.title;
  const nextType=input.type??current.type;
  const nextSubject=input.subject!==undefined?(input.subject.trim()||current.subject):current.subject;
  const nextPreview=input.previewText!==undefined?(input.previewText?.trim()||null):current.preview_text;
  const nextContent=input.content??current.content;
  const db=createAdminClient();
  let nextBroadcastId=current.provider_broadcast_id;
  if(current.status==="scheduled"){
    if(!current.scheduled_at)throw new Error("Scheduled edition is missing its send time.");
    if(!input.siteUrl)throw new Error("Site URL is required to update a scheduled edition.");
    if(current.provider_broadcast_id)await cancelNewsletterBroadcast(current.provider_broadcast_id);
    nextBroadcastId=await createNewsletterBroadcast({
      editionId:id,title:nextTitle,subject:nextSubject,previewText:nextPreview,
      content:nextContent as NewsletterContent,scheduledAt:current.scheduled_at,slug:current.slug,siteUrl:input.siteUrl
    });
  }
  const {data,error}=await db.from("newsletter_editions").update({
    title:nextTitle,type:nextType,subject:nextSubject,preview_text:nextPreview,content:nextContent,
    provider_broadcast_id:nextBroadcastId,provider_status:current.status==="scheduled"?"scheduled":current.provider_status,
    updated_by:input.adminId
  }).eq("id",id).select("*").single();
  if(error||!data)throw new Error(error?.message||"Could not update newsletter edition.");
  await audit(input.adminId,"newsletter_edited",id,{status:data.status});
  return data;
}
export async function scheduleNewsletterEdition(id:string,adminId:string,scheduledAt:string,siteUrl:string){
  const current=await getNewsletterEdition(id);
  if(current.status==="sent") throw new Error("Sent newsletter editions are immutable.");
  if(new Date(scheduledAt)<=new Date()) throw new Error("Choose a future send time.");
  const db=createAdminClient();
  if(current.provider_broadcast_id){
    await cancelNewsletterBroadcast(current.provider_broadcast_id);
  }
  const slug=current.slug||slugify(current.title)+"-"+Date.now().toString(36).slice(-6);
  const {count}=await db.from("newsletter_subscribers").select("id",{count:"exact",head:true}).eq("status","subscribed");
  const providerId=await createNewsletterBroadcast({
    editionId:id,title:current.title,subject:current.subject,previewText:current.preview_text,
    content:current.content as NewsletterContent,scheduledAt,slug,siteUrl
  });
  const {data,error}=await db.from("newsletter_editions").update({
    slug,scheduled_at:scheduledAt,status:"scheduled",provider_broadcast_id:providerId,provider_status:"scheduled",
    recipient_count:count??0,last_error:null,updated_by:adminId
  }).eq("id",id).select("*").single();
  if(error||!data) throw new Error(error?.message||"Could not save scheduled newsletter.");
  await audit(adminId,"newsletter_scheduled",id,{scheduled_at:scheduledAt,recipient_count:count??0});
  return data;
}

export async function sendNewsletterEdition(id:string,adminId:string,siteUrl:string){
  const current=await getNewsletterEdition(id);
  if(current.status==="sent") throw new Error("Newsletter has already been sent.");
  if(current.status==="scheduled") throw new Error("This edition is already scheduled.");
  const db=createAdminClient(), slug=current.slug||slugify(current.title)+"-"+Date.now().toString(36).slice(-6);
  const {count}=await db.from("newsletter_subscribers").select("id",{count:"exact",head:true}).eq("status","subscribed");
  const providerId=await createNewsletterBroadcast({
    editionId:id,title:current.title,subject:current.subject,previewText:current.preview_text,
    content:current.content as NewsletterContent,scheduledAt:null,slug,siteUrl
  });
  const now=new Date().toISOString();
  const {data,error}=await db.from("newsletter_editions").update({
    slug,status:"sent",sent_at:now,provider_broadcast_id:providerId,provider_status:"sent",
    recipient_count:count??0,last_error:null,updated_by:adminId
  }).eq("id",id).select("*").single();
  if(error||!data) throw new Error(error?.message||"Could not save sent newsletter.");
  await audit(adminId,"newsletter_sent",id,{recipient_count:count??0});
  return data;
}
export async function cancelScheduledNewsletter(id:string,adminId:string){
  const current=await getNewsletterEdition(id);
  if(current.status!=="scheduled") throw new Error("Only scheduled editions can be cancelled.");
  if(current.provider_broadcast_id) await cancelNewsletterBroadcast(current.provider_broadcast_id);
  const db=createAdminClient();
  const {data,error}=await db.from("newsletter_editions").update({
    status:"draft",scheduled_at:null,provider_broadcast_id:null,provider_status:"cancelled",updated_by:adminId
  }).eq("id",id).select("*").single();
  if(error||!data) throw new Error(error?.message||"Could not cancel newsletter schedule.");
  await audit(adminId,"newsletter_schedule_cancelled",id,{});
  return data;
}

export async function testNewsletterEdition(id:string,adminId:string,to:string,origin:string){
  const current=await getNewsletterEdition(id);
  const unsubscribeToken="test-preview";
  await sendNewsletterTest({
    to,title:current.title,subject:current.subject,
    content:current.content as NewsletterContent,slug:current.slug||slugify(current.title),siteUrl:origin
  });
  await audit(adminId,"newsletter_test_sent",id,{to});
  return {ok:true};
}

export async function analyticsNewsletterEdition(id:string){
  const current=await getNewsletterEdition(id);
  if(!current.provider_broadcast_id) return null;
  return getNewsletterAnalytics(current.provider_broadcast_id);
}

async function audit(adminId:string,action:string,targetId:string,metadata:Record<string,unknown>){
  const db=createAdminClient();
  await db.from("admin_actions").insert({admin_id:adminId,action,target_type:"newsletter",target_id:targetId,metadata});
}
export async function suggestionData(){
  const db=createAdminClient();
  const since=new Date(Date.now()-14*86400000).toISOString();
  const {data:projects}=await db.from("projects").select("id,name,slug,tagline,description,logo_url,screenshot_url,card_background_image_url,published_at").eq("status","published").gte("published_at",since).order("published_at",{ascending:false}).limit(20);
  const ids=(projects??[]).map(x=>x.id);
  const {data:votes}=ids.length?await db.from("project_votes").select("project_id").in("project_id",ids):{data:[]};
  const voteMap=new Map<string,number>(); for(const v of votes??[]) voteMap.set(v.project_id,(voteMap.get(v.project_id)||0)+1);
  const newProjects=(projects??[]).slice(0,8);
  const notable=[...(projects??[])].sort((a,b)=>(voteMap.get(b.id)||0)-(voteMap.get(a.id)||0)).slice(0,8);
  const {data:threads}=await db.from("community_threads").select("id,title,content,slug,vote_count,views,last_activity_at").order("last_activity_at",{ascending:false}).limit(20);
  const community=[...(threads??[])].sort((a,b)=>(Number(b.vote_count||0)*10+Number(b.views||0))-(Number(a.vote_count||0)*10+Number(a.views||0))).slice(0,8);
  return {newProjects,newVotes:notable,community,voteMap:Object.fromEntries(voteMap)};
}
