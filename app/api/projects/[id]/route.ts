import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { serviceUnavailable } from "@/lib/api-response";

const schema=z.object({name:z.string().trim().min(2).max(80),tagline:z.string().trim().min(5).max(120),description:z.string().trim().min(20).max(4000),website_url:z.string().trim().url().max(500).optional().or(z.literal("")),category_id:z.string().uuid()});

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!hasEnvVars) return serviceUnavailable();
  const {id}=await params; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:"Authentication required."},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>({}))); if(!parsed.success) return NextResponse.json({error:"Invalid project details."},{status:400});
  const patch={...parsed.data,website_url:parsed.data.website_url||null};
  const {error}=await supabase.from("projects").update(patch).eq("id",id).eq("owner_id",user.id);
  if(error) return NextResponse.json({error:"Could not update project."},{status:400});
  return NextResponse.json({ok:true});
}

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
  if(!hasEnvVars) return serviceUnavailable();
  const {id}=await params; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user) return NextResponse.json({error:"Authentication required."},{status:401});
  const {error}=await supabase.from("projects").update({status:"archived"}).eq("id",id).eq("owner_id",user.id);
  if(error) return NextResponse.json({error:"Could not archive project."},{status:400}); return NextResponse.json({ok:true});
}