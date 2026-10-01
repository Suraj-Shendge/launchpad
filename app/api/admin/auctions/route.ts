import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

const schema=z.object({project_id:z.string().uuid(),position_id:z.string().uuid(),starting_price:z.coerce.number().positive(),bid_increment:z.coerce.number().positive(),starts_at:z.string(),ends_at:z.string()}).refine(v=>new Date(v.ends_at)>new Date(v.starts_at),{message:"End time must be after start time."});

export async function POST(request:Request){
 const auth=await requireAdminApi("auctions.manage");if("error" in auth)return auth.error; const parsed=schema.safeParse(await request.json().catch(()=>({})));
 if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Invalid auction."},{status:400});
 const v=parsed.data; const admin=createAdminClient();
 const {data:position}=await admin.from("promotion_positions").select("id,slug").eq("id",v.position_id).in("slug",["homepage-hero","homepage-featured"]).maybeSingle();
 if(!position)return NextResponse.json({error:"Only homepage auction positions can be auctioned."},{status:400});
 const {data:project}=await admin.from("projects").select("id").eq("id",v.project_id).eq("status","published").maybeSingle();
 if(!project)return NextResponse.json({error:"Only published projects can be auctioned."},{status:400});
 const {data:used}=await admin.rpc("homepage_occupied_slots");
 const occupied=Number(used??10);
 const status=occupied>=10 || new Date(v.starts_at)>new Date() ? "scheduled" : "active";
 const {data:auction,error}=await admin.from("auctions").insert({project_id:v.project_id,position_id:v.position_id,starting_price:v.starting_price,bid_increment:v.bid_increment,starts_at:new Date(v.starts_at).toISOString(),ends_at:new Date(v.ends_at).toISOString(),status}).select("id").single();
 if(error||!auction)return NextResponse.json({error:"Could not create auction."},{status:500});
 const {data:{user}}=await auth.supabase.auth.getUser(); if(user)await admin.from("admin_actions").insert({admin_id:user.id,action:"auction_create",target_type:"auction",target_id:auction.id,metadata:v});
 return NextResponse.json({id:auction.id});
}
