import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { serviceUnavailable } from "@/lib/api-response";

const schema=z.object({amount:z.number().finite().positive(),project_id:z.string().uuid()});

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!hasEnvVars) return serviceUnavailable();
 const {id}=await params;
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) return NextResponse.json({error:"Authentication required."},{status:401});
 const parsed=schema.safeParse(await request.json().catch(()=>({})));
 if(!parsed.success)return NextResponse.json({error:"Invalid bid amount or project."},{status:400});
 const {data,error}=await supabase.rpc("place_bid",{p_auction_id:id,p_amount:parsed.data.amount,p_project_id:parsed.data.project_id});
 if(error)return NextResponse.json({error:error.message.replace(/^.*?DETAIL:\s*/,"")},{status:400});
 return NextResponse.json({bid:data});
}
