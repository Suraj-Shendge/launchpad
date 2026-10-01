import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listNewsletterEditions } from "@/lib/newsletter/admin-service";
import { ArrowUpRight, Mail, Plus, Users } from "lucide-react";

export default async function AdminNewsletter(){
 const auth=await requireAdmin("newsletter.view");
 const {editions,subscriberCount,confirmedSubscriberCount}=await listNewsletterEditions();
 return <div className="admin-page">
  <div className="admin-heading admin-heading-wide"><div><p className="eyebrow">Publishing / newsletter</p><h1>Newsletter.</h1><p>Curate weekly ProjectHub updates, review delivery and keep the public archive in sync.</p></div><Link href="/admin/newsletter/new" className="button-primary"><Plus size={14}/> New edition</Link></div>
  <div className="admin-stat-grid admin-stat-grid-3"><div className="admin-kpi"><div className="admin-kpi-top"><span>Confirmed subscribers</span><Users size={16}/></div><strong>{confirmedSubscriberCount}</strong><small>{subscriberCount} total records</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Published</span><Mail size={16}/></div><strong>{editions.filter(e=>e.status==="sent").length}</strong><small>public archive editions</small></div><div className="admin-kpi"><div className="admin-kpi-top"><span>Scheduled</span><Mail size={16}/></div><strong>{editions.filter(e=>e.status==="scheduled").length}</strong><small>awaiting delivery</small></div></div>
  <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Edition ledger</p><h2>All newsletters.</h2></div></div>
   <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Edition</th><th>Status</th><th>Recipients</th><th>Timing</th><th>Updated</th><th>Open</th></tr></thead><tbody>{editions.map(e=><tr key={e.id}><td><strong>{e.title}</strong><small>{e.type} · {e.subject}</small></td><td><span className={"admin-status "+(e.status==="sent"?"success":e.status==="scheduled"?"info":"warning")}>{e.status}</span>{e.last_error&&<small>{e.last_error}</small>}</td><td><strong>{e.recipient_count}</strong></td><td><small>{e.sent_at?"Sent "+new Date(e.sent_at).toLocaleString("en-IN"):(e.scheduled_at?"Scheduled "+new Date(e.scheduled_at).toLocaleString("en-IN"):"Draft")}</small></td><td><small>{new Date(e.updated_at).toLocaleString("en-IN")}</small></td><td><Link href={"/admin/newsletter/"+e.id} className="admin-text-button">Open <ArrowUpRight size={12}/></Link></td></tr>)}</tbody></table>{!editions.length&&<div className="admin-empty">No newsletter editions yet.</div>}</div>
  </section>
 </div>;
}
