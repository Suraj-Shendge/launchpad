import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { listNewsletterEditions, createNewsletterEdition } from "@/lib/newsletter/admin-service";

export async function GET(){
 const auth=await requireAdminApi("newsletter.view"); if("error" in auth)return auth.error;
 try{return NextResponse.json(await listNewsletterEditions());}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not load newsletter."},{status:500});}
}

export async function POST(request:Request){
 const auth=await requireAdminApi("newsletter.manage"); if("error" in auth)return auth.error;
 try{
  const body=await request.json().catch(()=>({}));
  const type=body.type==="announcement"?"announcement":"digest";
  const edition=await createNewsletterEdition({adminId:auth.user.id,type,title:typeof body.title==="string"?body.title:"ProjectHub Newsletter",subject:typeof body.subject==="string"?body.subject:undefined,previewText:typeof body.previewText==="string"?body.previewText:undefined});
  return NextResponse.json({edition},{status:201});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not create newsletter."},{status:400});}
}
