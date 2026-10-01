import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

const schema=z.object({status:z.enum(["draft","pending_review","published","rejected","archived"])});

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireAdminApi("projects.view");if("error" in auth)return auth.error;const supabase=auth.supabase;
 const {id}=await params;
 const parsed=schema.safeParse(await request.json().catch(()=>({})));
 if(!parsed.success)return NextResponse.json({error:"Invalid project status."},{status:400});
 const actionPermission=parsed.data.status==="published"||parsed.data.status==="archived"?"projects.publish":"projects.approve";
 if(!auth.access.permissions.includes(actionPermission))return NextResponse.json({error:"You do not have permission to change this project status."},{status:403});
 const admin=createAdminClient();
 if(parsed.data.status==="published"){
  const {data:project}=await admin.from("projects").select("id,name").eq("id",id).maybeSingle();
  if(!project)return NextResponse.json({error:"Project not found."},{status:404});
  const {data:verification}=await admin.from("project_verifications").select("github_status,overall_status").eq("project_id",id).maybeSingle();
  if(!verification || verification.github_status!=="verified") return NextResponse.json({error:"GitHub verification is required before this project can be published."},{status:409});
 }
 const patch=parsed.data.status==="published"
  ? {status:parsed.data.status,published_at:new Date().toISOString()}
  : {status:parsed.data.status};
 const {error}=await admin.from("projects").update(patch).eq("id",id);
 if(error)return NextResponse.json({error:"Could not update project."},{status:500});
 const {data:{user}}=await supabase.auth.getUser();
 if(user) await admin.from("admin_actions").insert({admin_id:user.id,action:"project_status_change",target_type:"project",target_id:id,metadata:{status:parsed.data.status}});
 return NextResponse.json({ok:true});
}