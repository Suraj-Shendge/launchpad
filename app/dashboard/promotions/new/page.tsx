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
 const {data:promotionType}=await supabase.from("promotion_types").select("default_duration_days").eq("slug","featured").maybeSingle();
 const {data:featuredIds}=await supabase.rpc("get_explore_featured_project_ids",{p_limit:5});
 const price=Number(setting?.value ?? 999);
 const durationDays=Number(promotionType?.default_duration_days ?? 7);
 const activeSlots=featuredIds?.length ?? 0;
 return <div><Navbar authenticated/><main className="section promotion-checkout-page"><div className="promotion-checkout-intro"><p className="eyebrow">Explore Featured</p><h1 className="section-title">Choose a project to feature.</h1><p className="section-copy">Get a published project featured above the Explore search bar for {durationDays} days.</p></div><PromoteCheckout projects={projects??[]} price={price} activeSlots={activeSlots} durationDays={durationDays}/></main><Footer/></div>;
}