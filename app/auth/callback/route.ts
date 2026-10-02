import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

export async function GET(request:NextRequest){
 const {searchParams,origin}=new URL(request.url);
 const code=searchParams.get("code");
 const oauthError=searchParams.get("error");
 const oauthErrorDescription=searchParams.get("error_description");
 const nextParam=searchParams.get("next")??"/dashboard";
 const next=nextParam.startsWith("/")&&!nextParam.startsWith("//")?nextParam:"/dashboard";
 if(oauthError)return NextResponse.redirect(new URL("/auth/error?error="+encodeURIComponent(oauthErrorDescription||oauthError),origin));
 if(!code)return NextResponse.redirect(new URL("/auth/error?error=Missing authentication code",origin));
 const supabase=await createClient();
 const {data,error}=await supabase.auth.exchangeCodeForSession(code);
 if(error||!data.user)return NextResponse.redirect(new URL("/auth/error?error="+encodeURIComponent(error?.message||"Authentication failed"),origin));
 const githubConnected=data.user.identities?.some(identity=>identity.provider==="github");
 if(githubConnected){
  const admin=createAdminClient();
  await admin.from("profiles").update({github_connected:true}).eq("id",data.user.id);
 }
 return NextResponse.redirect(new URL(next,origin));
}
