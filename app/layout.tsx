import type { Metadata } from "next";
import { CookieConsent } from "@/components/projecthub/cookie-consent";
import { getSiteUrl } from "@/lib/site-url";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets:["latin"], variable:"--font-geist", display:"swap" });
const baseUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase:new URL(baseUrl),
  title:{default:"ProjectHub — Discover & Launch New Products, Tools & Startups", template:"%s — ProjectHub"},
  description:"Discover new products, tools, startups and ideas on ProjectHub, or launch your own project and get discovered by founders, makers and developers.",
  alternates:{canonical:"/"},
  keywords:["product discovery","product launch platform","startup launches","indie makers","developer tools","new products","ProjectHub"],
  openGraph:{title:"ProjectHub — Discover & Launch New Products, Tools & Startups",description:"Discover new products, tools, startups and ideas, or launch your own and get discovered on ProjectHub.",type:"website",url:baseUrl,images:["/opengraph-image.png"]},
  twitter:{card:"summary_large_image",title:"ProjectHub — Discover & Launch New Products, Tools & Startups",description:"Discover new products, tools, startups and ideas, or launch your own and get discovered on ProjectHub.",images:["/twitter-image.png"]},
  robots:{index:true,follow:true},
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body className={geist.variable}>{children}<CookieConsent/></body></html>;
}
