import Link from "next/link";
import { getAdminAccess, type AdminPermission } from "@/lib/admin-access";
import { Activity, BarChart3, FileText, Gavel, LayoutDashboard, Mail, Megaphone, MessageSquare, Settings, ShieldAlert, Users, WalletCards } from "lucide-react";

const groups=[
  {label:"Control",links:[["Overview","/admin",LayoutDashboard,"overview.view"],["Projects","/admin/projects",FileText,"projects.view"],["Reports","/admin/reports",ShieldAlert,"reports.view"],["Newsletter","/admin/newsletter",Mail,"newsletter.view"]]},
  {label:"People",links:[["Users","/admin/users",Users,"users.view"],["Community","/admin/community",MessageSquare,"community.view"]]},
  {label:"Monetization",links:[["Promotions","/admin/promotions",Megaphone,"promotions.view"],["Auctions","/admin/auctions",Gavel,"auctions.view"],["Payments","/admin/payments",WalletCards,"payments.view"]]},
  {label:"Insights",links:[["Analytics","/admin/analytics",BarChart3,"analytics.view"],["Audit log","/admin/audit",Activity,"audit.view"]]},
  {label:"System",links:[["Settings","/admin/settings",Settings,"settings.view"]]}
];
export default async function AdminLayout({children}:{children:React.ReactNode}){
  const {access}=await getAdminAccess();
  return <div className="admin-layout"><aside className="admin-sidebar"><Link href="/" className="wordmark">Project<span>Hub</span></Link><p className="admin-label">Control room</p>{groups.map(g=>{const visible=g.links.filter(([, , ,permission])=>access.permissions.includes(permission as AdminPermission)||access.isSuperAdmin);if(!visible.length)return null;return <div className="admin-nav-group" key={g.label}><span>{g.label}</span>{visible.map(([name,href,Icon])=>{const I=Icon as typeof Activity;return <Link href={href as string} key={href as string}><I size={14}/><b>{name as string}</b></Link>})}</div>})}</aside><main className="admin-main">{children}</main></div>;
}
