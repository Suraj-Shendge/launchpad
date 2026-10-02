import Link from "next/link";
import { requireAdmin, getAdminAccess } from "@/lib/auth";
import { getNewsletterEdition } from "@/lib/newsletter/admin-service";
import { NewsletterEditor } from "@/components/projecthub/newsletter-editor";
import { analyticsNewsletterEdition } from "@/lib/newsletter/admin-service";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
 const title = "Newsletter | ProjectHub Admin";
 return { title };
}

export default async function EditNewsletter({params}:{params:Promise<{id:string}>}){
 const auth=await requireAdmin("newsletter.view"); const {access}=await getAdminAccess(); const id=(await params).id;
 const edition=await getNewsletterEdition(id);
 const analytics=edition.status==="sent"?await analyticsNewsletterEdition(id):null;
 return <div className="admin-page"><div className="admin-heading"><div><p className="eyebrow">Publishing / newsletter / edition</p><h1>{edition.title}</h1><p>{edition.status==="sent"?"Published edition. Content is locked after send.":"Draft the editorial content and control its send lifecycle."}</p></div><Link href="/admin/newsletter" className="text-link">← Newsletter</Link></div>{analytics&&<section className="admin-card newsletter-analytics-card"><div className="admin-section-head"><div><p className="eyebrow">Campaign analytics</p><h2>Delivery and engagement.</h2></div></div><div className="admin-detail-grid admin-detail-grid-3"><div><small>Delivered</small><strong>{analytics.delivered}</strong></div><div><small>Opened</small><strong>{analytics.opened}</strong></div><div><small>Clicked</small><strong>{analytics.clicked}</strong></div><div><small>Bounced</small><strong>{analytics.bounced}</strong></div><div><small>Unsubscribed</small><strong>{analytics.unsubscribed}</strong></div><div><small>Suppressed</small><strong>{analytics.suppressed}</strong></div></div></section>}<NewsletterEditor initial={edition} canSend={access.permissions.includes("newsletter.send")||access.isSuperAdmin}/></div>;
}
