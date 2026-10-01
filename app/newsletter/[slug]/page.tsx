import { notFound } from "next/navigation";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { createClient } from "@/lib/supabase/server";
import { NewsletterRender } from "@/components/projecthub/newsletter-render";

export default async function NewsletterEdition({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params,supabase=await createClient();
 const {data:edition}=await supabase.from("newsletter_editions").select("id,title,subject,preview_text,content,sent_at").eq("slug",slug).eq("status","sent").maybeSingle();
 if(!edition)notFound();
 return <div><Navbar/><main className="section newsletter-edition-page"><header className="newsletter-edition-head"><p className="eyebrow">ProjectHub Newsletter</p><h1>{edition.title}</h1>{edition.preview_text&&<p>{edition.preview_text}</p>}<span>{edition.sent_at?new Date(edition.sent_at).toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"}):""}</span></header><article><NewsletterRender content={edition.content}/></article></main><Footer/></div>;
}
