import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { suggestionData } from "@/lib/newsletter/admin-service";

export async function GET(){
 const auth=await requireAdminApi("newsletter.manage");if("error" in auth)return auth.error;
 try{return NextResponse.json(await suggestionData());}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not load suggestions."},{status:500});}
}
