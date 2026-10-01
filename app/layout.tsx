import type { Metadata } from "next";
import { CookieConsent } from "@/components/projecthub/cookie-consent";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets:["latin"], variable:"--font-geist", display:"swap" });
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase:new URL(baseUrl),
  title:{default:"ProjectHub — Launch. Discover. Promote.", template:"%s — ProjectHub"},
  description:"A premium product discovery, launch and promotion platform for founders, developers, creators and makers.",
  openGraph:{title:"ProjectHub — Launch. Discover. Promote.",description:"Launch, discover and promote the next generation of projects.",type:"website"},
  robots:{index:true,follow:true},
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body className={`${geist.variable} font-sans`}>{children}<CookieConsent/></body></html>;
}
