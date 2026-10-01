import { NextResponse } from "next/server";
import { unsubscribeFromNewsletter } from "@/lib/newsletter/service";

export async function GET(request:Request){
 const url=new URL(request.url),token=url.searchParams.get("token");
 if(!token)return NextResponse.redirect(new URL("/newsletter/unsubscribe?done=0",url));
 try{await unsubscribeFromNewsletter(token);return NextResponse.redirect(new URL("/newsletter/unsubscribe?done=1",url));}
 catch(error){const target=new URL("/newsletter/unsubscribe?done=0",url);target.searchParams.set("error",error instanceof Error?error.message:"Unsubscribe failed.");return NextResponse.redirect(target);}
}
