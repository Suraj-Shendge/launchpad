import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { NewsletterNewForm } from "@/components/projecthub/newsletter-new-form";

export default async function NewNewsletter(){
 await requireAdmin("newsletter.manage");
 return <div className="admin-page"><div className="admin-heading"><div><p className="eyebrow">Publishing / newsletter</p><h1>New edition.</h1><p>Start a draft, then curate the content before sending or scheduling.</p></div><Link href="/admin/newsletter" className="text-link">← Newsletter</Link></div><NewsletterNewForm/></div>;
}
