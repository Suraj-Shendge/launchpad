import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNewsletterBroadcast } from "@/lib/newsletter/provider";

export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,auth=request.headers.get("authorization")||"";
 if(!secret||auth!=="Bearer "+secret)return new NextResponse("Unauthorized",{status:401});
 const db=createAdminClient();
 const {data:editions,error}=await db.from("newsletter_editions").select("id,provider_broadcast_id,status").eq("status","scheduled").not("provider_broadcast_id","is",null).limit(100);
 if(error)return NextResponse.json({error:error.message},{status:500});
 let synced=0,failed=0;
 for(const edition of editions||[]){
  try{
   const broadcast=await getNewsletterBroadcast(edition.provider_broadcast_id);
   if(broadcast.status==="sent"||broadcast.sent_at){
    await db.from("newsletter_editions").update({status:"sent",sent_at:broadcast.sent_at||new Date().toISOString(),provider_status:"sent"}).eq("id",edition.id);
    synced++;
   }else{await db.from("newsletter_editions").update({provider_status:broadcast.status}).eq("id",edition.id);}
  }catch(error){failed++;await db.from("newsletter_editions").update({last_error:error instanceof Error?error.message:"Provider status sync failed"}).eq("id",edition.id);}
 }
 return NextResponse.json({ok:true,synced,failed});
}
