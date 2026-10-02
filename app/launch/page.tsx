import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { LaunchForm } from "@/components/projecthub/launch-form";
import { getCategories } from "@/lib/data";

type Params=Promise<{url?:string}>;

export const metadata: Metadata = {
  title: "Launch your project",
  description: "Launch your product, startup, tool or idea on ProjectHub. Start with a GitHub repository or website and submit it for review.",
  alternates: { canonical: "/launch" },
  openGraph: { title: "Launch your project — ProjectHub", description: "Submit your product, startup, tool or idea to ProjectHub and get discovered.", type: "website" },
};

export default async function LaunchPage({searchParams}:{searchParams:Params}){
  const params=await searchParams;
  const categories=await getCategories();
  return <div><Navbar/><main className="section launch-page">
    <Link href="/" className="back-link"><ArrowLeft size={14}/>Back to home</Link>
    <div className="launch-intro">
      <p className="eyebrow">Launch</p>
      <h1>Tell the world<br/><em>what you built.</em></h1>
      <p>Start with a URL. Fetch the details, refine the story, add visuals, choose a category, and send your project to moderation.</p>
    </div>
    <LaunchForm categories={categories} initialUrl={params.url||""}/>
  </main><Footer/></div>;
}
