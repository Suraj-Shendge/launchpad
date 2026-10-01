import Link from "next/link";
import { NewsletterSignup } from "@/components/projecthub/newsletter-signup";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";

export default async function NewsletterUnsubscribe({searchParams}:{searchParams:Promise<{done?:string;error?:string}>}){
 const params=await searchParams;
 return <div><Navbar/><main className="section newsletter-unsubscribe-page"><section className="newsletter-unsubscribe-card"><p className="eyebrow">ProjectHub Newsletter</p>{params.done==="1"?<><h1>You’re unsubscribed.</h1><p>You will no longer receive ProjectHub newsletters at this address.</p><Link href="/newsletter" className="button-outline">Back to Newsletter</Link></>:<><h1>Manage your subscription.</h1><p>{params.error||"Your unsubscribe link is invalid or incomplete."}</p><NewsletterSignup compact/></>}</section></main><Footer/></div>;
}
