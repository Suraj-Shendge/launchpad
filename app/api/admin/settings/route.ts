import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema=z.record(z.string(),z.string().max(100));

export async function PATCH(request:Request){
 const auth=await requireAdminApi("settings.edit");if("error" in auth)return auth.error; const values=schema.safeParse(await request.json().catch(()=>({})));
 if(!values.success)return NextResponse.json({error:"Invalid settings payload."},{status:400});
 const admin=createAdminClient();
 for(const [key,value] of Object.entries(values.data)){
   if(!["featured_promotion_price","auction_starting_price","auction_min_bid_increment","promotion_duration_days","auction_duration_hours"].includes(key))continue;
   const numeric=Number(value); if(!Number.isFinite(numeric)||numeric<=0)return NextResponse.json({error:"Invalid value for "+key+"."},{status:400});
   await admin.from("settings").upsert({key,value:numeric.toString(),is_public:true});
 }
 const {data:{user}}=await auth.supabase.auth.getUser(); if(user)await admin.from("admin_actions").insert({admin_id:user.id,action:"settings_update",target_type:"settings",metadata:values.data});
 return NextResponse.json({ok:true});
}
