import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Gavel, Sparkles } from "lucide-react";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";

export const metadata: Metadata = {
  title: "Promote your project",
  description: "Promote a ProjectHub project with Featured placement or bid for premium homepage visibility.",
  alternates: { canonical: "/promote" },
  openGraph: { title: "Promote your project — ProjectHub", description: "Choose Featured promotion or homepage auction visibility for your ProjectHub launch.", type: "website" },
};

export default function Promote(){
  return <div><Navbar/><main className="section promote-page">
    <div style={{maxWidth:720,marginBottom:40}}><p className="eyebrow">Promote</p><h1 className="section-title" style={{fontSize:"clamp(44px,6vw,72px)"}}>Turn a good launch into a visible one.</h1><p className="section-copy">ProjectHub separates organic discovery from paid placement. Pick the visibility mechanism that fits your goal.</p></div>
    <div className="promotion-options">
      <article className="promotion-option"><div className="promotion-icon"><Sparkles size={18}/></div><div><p className="eyebrow">Featured promotion</p><h2>Feature your project</h2><p>Purchase a configurable featured promotion. Payment is verified server-side before activation.</p><Link href="/dashboard/promotions/new" className="text-link">Choose featured <ArrowUpRight size={15}/></Link></div><strong>₹999</strong></article>
      <article className="promotion-option"><div className="promotion-icon"><Gavel size={18}/></div><div><p className="eyebrow">Homepage auction</p><h2>Bid for premium placement</h2><p>Compete for an active homepage placement with an authoritative countdown and atomic bid validation.</p><Link href="/auctions" className="text-link">See live auctions <ArrowUpRight size={15}/></Link></div><strong>₹1,499+</strong></article>
    </div>
  </main><Footer/></div>;
}