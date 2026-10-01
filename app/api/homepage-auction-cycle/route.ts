import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseServerEnv } from "@/lib/utils";

export async function GET(request:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret||request.headers.get("authorization")!=="Bearer "+secret)
    return new NextResponse("Unauthorized",{status:401});
  if(!hasSupabaseServerEnv)
    return NextResponse.json({error:"Supabase is not configured."},{status:503});

  const admin=createAdminClient();
  const {data,error}=await admin.rpc("sync_homepage_auction_cycle");
  if(error)
    return NextResponse.json({error:error.message},{status:500});

  return NextResponse.json({ok:true,created:Number(data??0)});
}
