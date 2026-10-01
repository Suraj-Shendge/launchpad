import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { analyticsNewsletterEdition } from "@/lib/newsletter/admin-service";

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireAdminApi("newsletter.view");if("error" in auth)return auth.error;
 try{return NextResponse.json({analytics:await analyticsNewsletterEdition((await params).id)});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not load analytics."},{status:400});}
}
