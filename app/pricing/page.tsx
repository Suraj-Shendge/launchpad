import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Gavel } from "lucide-react";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";

export const metadata: Metadata = {
  title: "Pricing",
  description: "See ProjectHub launch, Featured promotion and homepage auction pricing.",
  alternates: { canonical: "/pricing" },
  openGraph: { title: "Pricing — ProjectHub", description: "ProjectHub launch, Featured promotion and homepage auction pricing.", type: "website" },
};

export default function Pricing(){
  return <div><Navbar/><main className="section pricing-page">
    <p className="eyebrow">Pricing</p><h1 className="section-title pricing-title">Visibility, when you need it.</h1>
    <p className="section-copy pricing-copy">Launch organically, buy featured placement, or compete for premium homepage attention.</p>
    <div className="pricing-grid">
      <article className="price-card"><BadgeCheck size={20}/><p className="eyebrow">Launch</p><h2>Free</h2><p>Submit your project for review and publish when approved.</p><Link href="/submit">Launch free <ArrowUpRight size={15}/></Link></article>
      <article className="price-card price-card-dark"><BadgeCheck size={20}/><p className="eyebrow">Featured</p><h2>₹999</h2><p>Featured project promotion with configurable duration and placement.</p><Link href="/promote">Promote a project <ArrowUpRight size={15}/></Link></article>
      <article className="price-card"><Gavel size={20}/><p className="eyebrow">Homepage auction</p><h2>From ₹1,499</h2><p>Bid for premium homepage placements. Final price is determined by the auction.</p><Link href="/auctions">View auctions <ArrowUpRight size={15}/></Link></article>
    </div>
  </main><Footer/></div>;
}