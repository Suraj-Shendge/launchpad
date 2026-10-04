import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { serviceUnavailable } from "@/lib/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const url=z.string().trim().max(500).refine(value=>value===""||/^https?:\/\//i.test(value),"Invalid URL.");

const schema=z.object({
 display_name:z.string().trim().min(1).max(60).optional(),
 username:z.string().trim().regex(/^[A-Za-z0-9_-]{0,30}$/).optional(),
 bio:z.string().max(280).optional(),
 avatar_url:url.optional(),
 website_url:url.optional(),
 twitter_url:url.optional(),
 linkedin_url:url.optional(),
 github_url:url.optional(),
});

export async function PATCH(request:Request){
 if(!hasEnvVars)return serviceUnavailable();
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const limiter=createAdminClient();
 if(!await consumeRateLimit(limiter,"profile-update:"+user.id,{limit:10,windowSeconds:600})) return rateLimitResponse();
 const body=await request.json().catch(()=>({}));
 const parsed=schema.safeParse(body);
 if(!parsed.success)return NextResponse.json({error:"Invalid profile details."},{status:400});
 if(!Object.keys(parsed.data).length)return NextResponse.json({error:"No profile changes supplied."},{status:400});
 const {error}=await supabase.from("profiles").update(parsed.data).eq("id",user.id);
 if(error?.code==="23505")return NextResponse.json({error:"That username is already in use."},{status:409});
 if(error)return NextResponse.json({error:"Could not update profile."},{status:500});
 return NextResponse.json({ok:true});
}
