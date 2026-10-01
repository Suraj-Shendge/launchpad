import Link from "next/link";
import { NewsletterSignup } from "@/components/projecthub/newsletter-signup";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { createClient } from "@/lib/supabase/server";

export default async function NewsletterPage({searchParams}:{searchParams:Promise<{confirmed?:string;error?:string}>}){
 const params=await searchParams, supabase=await createClient();
 const {data:editions}=await supabase.from("newsletter_editions").select("id,title,slug,subject,preview_text,sent_at").eq("status","sent").order("sent_at",{ascending:false}).limit(24);
 return <div><Navbar/><main className="section newsletter-page">
  <section className="newsletter-landing"><div><p className="eyebrow">ProjectHub Newsletter</p><h1 className="section-title">The projects, makers and conversations worth seeing.</h1><p className="section-copy">A weekly digest of launches, community highlights and important ProjectHub updates — curated by the people running the platform.</p></div><div className="newsletter-signup-card"><NewsletterSignup/><p className="newsletter-privacy-note">By subscribing, you agree to receive the ProjectHub Newsletter. You can unsubscribe anytime.</p></div></section>
  {params.confirmed==="1"&&<div className="newsletter-alert success">Your subscription is confirmed. Welcome to ProjectHub Newsletter.</div>}
  {params.confirmed==="0"&&params.error&&<div className="newsletter-alert">{params.error}</div>}
  <section className="newsletter-archive"><div className="newsletter-archive-head"><div><p className="eyebrow">Archive</p><h2>Previous editions.</h2></div><span>{editions?.length??0} published</span></div>
   <div className="newsletter-archive-grid">{(editions??[]).map(e=><Link href={"/newsletter/"+e.slug} className="newsletter-archive-card" key={e.id}><span>{e.sent_at?new Date(e.sent_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):""}</span><strong>{e.title}</strong><p>{e.preview_text||e.subject}</p><i>↗</i></Link>)}</div>
   {!editions?.length&&<div className="newsletter-empty">No editions have been published yet. The first one will appear here.</div>}
  </section>
 </main><Footer/></div>;
}
