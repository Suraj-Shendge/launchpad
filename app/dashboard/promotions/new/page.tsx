import { redirect } from "next/navigation";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { PromoteCheckout } from "@/components/projecthub/promote-checkout";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function NewPromotion(){
  if(!hasEnvVars) redirect("/login");
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
 const {data:projects}=await supabase.from("projects").select("id,name,slug").eq("owner_id",user.id).eq("status","published").order("name");
 const {data:setting}=await supabase.from("settings").select("value").eq("key","featured_promotion_price").maybeSingle();
 const price=Number(setting?.value ?? 999);
 return <div><Navbar authenticated/><main className="section"><p className="eyebrow">Featured promotion</p><h1 className="section-title" style={{fontSize:"clamp(44px,6vw,68px)"}}>Choose a project to feature.</h1><p className="section-copy">The current configured featured promotion price is ₹{price.toLocaleString("en-IN")}.</p><PromoteCheckout projects={projects??[]} price={price}/></main><Footer/></div>;
}