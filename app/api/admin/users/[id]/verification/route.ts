import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

const schema=z.object({verification_tier:z.enum(["none","member","founder","entrepreneur","celebrity"])});

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireAdminApi("users.verify");if("error" in auth)return auth.error;const {id}=await params;
 const parsed=schema.safeParse(await request.json().catch(()=>({})));
 if(!parsed.success)return NextResponse.json({error:"Invalid verification tier."},{status:400});
 const admin=createAdminClient();
 const {data:target,error}=await admin.from("profiles").select("id,display_name,username").eq("id",id).maybeSingle();
 if(error||!target)return NextResponse.json({error:"User not found."},{status:404});
 const {error:updateError}=await admin.from("profiles").update({verification_tier:parsed.data.verification_tier}).eq("id",id);
 if(updateError)return NextResponse.json({error:"Could not update verification."},{status:500});
 const {data:{user}}=await auth.supabase.auth.getUser();
 if(user)await admin.from("admin_actions").insert({admin_id:user.id,action:"verification_update",target_type:"profile",target_id:id,metadata:{verification_tier:parsed.data.verification_tier}});
 return NextResponse.json({ok:true});
}
