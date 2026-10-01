import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminApi, isAdminPermission, type AdminRole } from "@/lib/admin-access";

const schema=z.object({role:z.enum(["none","admin","moderator","finance_admin","content_admin","community_admin","custom"]),permissions:z.array(z.string()).default([]),expires_at:z.string().datetime().nullable().optional()});

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireAdminApi("users.view");
 if("error" in auth)return auth.error;
 if(!auth.access.isSuperAdmin)return NextResponse.json({error:"Only the platform owner can manage administrator access."},{status:403});
 const {id}=await params;
 const parsed=schema.safeParse(await request.json().catch(()=>({})));
 if(!parsed.success)return NextResponse.json({error:"Invalid administrator access payload."},{status:400});
 if(id===auth.user.id)return NextResponse.json({error:"The platform owner does not need a delegated admin record."},{status:400});
 const permissions=[...new Set(parsed.data.permissions.filter(isAdminPermission))];
 if(parsed.data.role!=="custom"){
  // Keep the user's explicit edits, but never allow reserved administrator-management permissions.
  if(permissions.some(p=>p.startsWith("admins.")))return NextResponse.json({error:"Administrator-management permissions are reserved for the platform owner."},{status:400});
 }
 if(parsed.data.expires_at&&new Date(parsed.data.expires_at)<=new Date())return NextResponse.json({error:"Expiration must be in the future."},{status:400});
 const admin=createAdminClient();
 const {data:target,error:targetError}=await admin.from("profiles").select("id,display_name,username").eq("id",id).maybeSingle();
 if(targetError||!target)return NextResponse.json({error:"User not found."},{status:404});
 if(parsed.data.role==="none"){
  const {error}=await admin.from("admin_access").delete().eq("user_id",id);
  if(error)return NextResponse.json({error:"Could not remove admin access."},{status:500});
  await admin.from("admin_actions").insert({admin_id:auth.user.id,action:"admin_access_remove",target_type:"profile",target_id:id,metadata:{user:target}});
  return NextResponse.json({ok:true});
 }
 const {error}=await admin.from("admin_access").upsert({user_id:id,role:parsed.data.role,permissions,expires_at:parsed.data.expires_at??null,created_by:auth.user.id,updated_at:new Date().toISOString()},{onConflict:"user_id"});
 if(error)return NextResponse.json({error:"Could not save admin access."},{status:500});
 await admin.from("admin_actions").insert({admin_id:auth.user.id,action:"admin_access_update",target_type:"profile",target_id:id,metadata:{role:parsed.data.role,permissions,expires_at:parsed.data.expires_at??null}});
 return NextResponse.json({ok:true});
}
