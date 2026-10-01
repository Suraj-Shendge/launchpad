import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getNewsletterEdition } from "@/lib/newsletter/admin-service";
import { NewsletterEmail } from "@/emails/newsletter";
import { render } from "@react-email/render";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireAdminApi("newsletter.view");if("error" in auth)return auth.error;
 try{const edition=await getNewsletterEdition((await params).id);const origin=new URL(request.url).origin;const html=await render(NewsletterEmail({title:edition.title,subject:edition.subject,content:edition.content,archiveUrl:origin+"/newsletter/"+(edition.slug||"preview"),unsubscribeUrl:origin+"/newsletter",siteUrl:origin}));return new NextResponse(html,{headers:{"content-type":"text/html; charset=utf-8"}});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Preview failed."},{status:400});}
}
