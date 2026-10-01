import { NextResponse } from "next/server";
import { confirmNewsletterSubscription } from "@/lib/newsletter/service";

export async function GET(request:Request){
 const url=new URL(request.url),token=url.searchParams.get("token");
 if(!token)return NextResponse.redirect(new URL("/newsletter?confirmed=0",url));
 try{await confirmNewsletterSubscription(token,url.origin);return NextResponse.redirect(new URL("/newsletter?confirmed=1",url));}
 catch(error){const target=new URL("/newsletter?confirmed=0",url);target.searchParams.set("error",error instanceof Error?error.message:"Confirmation failed.");return NextResponse.redirect(target);}
}
