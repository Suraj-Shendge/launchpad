import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNewsletterSubscription, unsubscribeUserFromNewsletter } from "@/lib/newsletter/service";

export async function GET(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 return NextResponse.json({subscription:await getNewsletterSubscription(user.id)});
}

export async function DELETE(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 await unsubscribeUserFromNewsletter(user.id);
 return NextResponse.json({ok:true});
}
