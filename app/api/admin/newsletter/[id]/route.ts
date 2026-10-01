import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getNewsletterEdition, updateNewsletterEdition, scheduleNewsletterEdition, sendNewsletterEdition, cancelScheduledNewsletter, testNewsletterEdition } from "@/lib/newsletter/admin-service";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireAdminApi("newsletter.view");if("error" in auth)return auth.error;
 try{return NextResponse.json({edition:await getNewsletterEdition((await params).id)});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Not found."},{status:404});}
}

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireAdminApi("newsletter.manage");if("error" in auth)return auth.error;
 const id=(await params).id;
 try{
  const body=await request.json().catch(()=>({}));
  if(body.action==="schedule"){const at=typeof body.scheduledAt==="string"?body.scheduledAt:"";return NextResponse.json({edition:await scheduleNewsletterEdition(id,auth.user.id,at,new URL(request.url).origin)});}
  if(body.action==="send"){const sendAuth=await requireAdminApi("newsletter.send");if("error" in sendAuth)return sendAuth.error;return NextResponse.json({edition:await sendNewsletterEdition(id,sendAuth.user.id,new URL(request.url).origin)});}
  if(body.action==="cancel"){return NextResponse.json({edition:await cancelScheduledNewsletter(id,auth.user.id)});}
  if(body.action==="test"){return NextResponse.json(await testNewsletterEdition(id,auth.user.id,typeof body.to==="string"?body.to:auth.user.email,new URL(request.url).origin));}
  return NextResponse.json({edition:await updateNewsletterEdition(id,{adminId:auth.user.id,title:body.title,type:body.type,subject:body.subject,previewText:body.previewText,content:body.content,siteUrl:new URL(request.url).origin})});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not update newsletter."},{status:400});}
}

export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireAdminApi("newsletter.manage");if("error" in auth)return auth.error;
 try{const id=(await params).id;const current=await getNewsletterEdition(id);if(current.status!=="draft")throw new Error("Only draft editions can be deleted.");const db=(await import("@/lib/supabase/admin")).createAdminClient();const {error}=await db.from("newsletter_editions").delete().eq("id",id);if(error)throw new Error(error.message);return NextResponse.json({ok:true});}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not delete newsletter."},{status:400});}
}
