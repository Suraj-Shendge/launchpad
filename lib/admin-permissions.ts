export const ADMIN_PERMISSION_GROUPS=[
 {key:"control",label:"Control",permissions:[["overview.view","View overview"],["projects.view","View projects"],["projects.edit","Edit projects"],["projects.approve","Approve / reject projects"],["projects.publish","Publish / archive projects"],["projects.delete","Delete projects"],["newsletter.view","View newsletter"],["newsletter.manage","Manage newsletter"],["newsletter.send","Send / schedule newsletter"]]},
 {key:"people",label:"People",permissions:[["users.view","View users"],["users.edit","Edit profiles"],["users.block","Block / unblock users"],["users.verify","Manage verification"],["users.assign_roles","Assign ProjectHub roles"],["community.view","View community"],["community.moderate","Moderate community"],["reports.view","View reports"]]},
 {key:"monetization",label:"Monetization",permissions:[["promotions.view","View promotions"],["promotions.manage","Manage promotions"],["auctions.view","View auctions"],["auctions.manage","Manage auctions"],["payments.view","View payments"],["payments.manage","Manage payments / refunds"]]},
 {key:"insights",label:"Insights",permissions:[["analytics.view","View analytics"],["audit.view","View audit log"]]},
 {key:"system",label:"System",permissions:[["settings.view","View settings"],["settings.edit","Edit settings"]]},
] as const;
export type AdminPermission=(typeof ADMIN_PERMISSION_GROUPS)[number]["permissions"][number][0];
export type AdminRole="admin"|"moderator"|"finance_admin"|"content_admin"|"community_admin"|"custom";
const ALL_PERMISSIONS=ADMIN_PERMISSION_GROUPS.flatMap(g=>g.permissions.map(p=>p[0])) as AdminPermission[];
export const ADMIN_ALL_PERMISSIONS=[...new Set(ALL_PERMISSIONS)];
export const ADMIN_ROLE_PRESETS:Record<AdminRole,AdminPermission[]>={
 admin:ADMIN_ALL_PERMISSIONS.filter(p=>p!=="projects.delete"&&p!=="payments.manage"&&p!=="settings.edit"),
 moderator:["overview.view","projects.view","projects.edit","projects.approve","users.view","users.edit","users.block","users.verify","community.view","community.moderate","reports.view"],
 finance_admin:["overview.view","promotions.view","promotions.manage","auctions.view","auctions.manage","payments.view","payments.manage","analytics.view","audit.view"],
 content_admin:["overview.view","projects.view","projects.edit","projects.approve","projects.publish","projects.delete","newsletter.view","newsletter.manage","newsletter.send","promotions.view","promotions.manage","analytics.view"],
 community_admin:["overview.view","users.view","users.edit","users.block","community.view","community.moderate","reports.view","analytics.view"],
 custom:[],
};
export const ADMIN_ROLE_LABELS:Record<AdminRole,string>={admin:"Admin",moderator:"Moderator",finance_admin:"Finance Admin",content_admin:"Content Admin",community_admin:"Community Admin",custom:"Custom"};
export function isAdminPermission(value:string):value is AdminPermission{return ADMIN_ALL_PERMISSIONS.includes(value as AdminPermission)}
