import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { AdminUserVerification } from "@/components/projecthub/admin-user-verification";
import { AdminAccessEditor } from "@/components/projecthub/admin-access-editor";
import { getAdminAccess, isAdminPermission, type AdminRole } from "@/lib/admin-access";
import { getProfileTier } from "@/lib/profile";
import { Ban, CheckCircle2, ShieldCheck, Users } from "lucide-react";

export default async function AdminUsers(){
  await requireAdmin("users.view");
  const {access,user:currentAdmin}=await getAdminAccess();
  const db=createAdminClient();
  const {data:users}=await db.from("profiles").select("id,display_name,username,verification_tier,github_connected,created_at,is_admin,is_blocked,can_submit,can_bid,can_promote").order("created_at",{ascending:false}).limit(200);
  const ids=(users??[]).map(u=>u.id);
  const [projects,follows,collections,adminAccessRows]=await Promise.all([
    ids.length?db.from("projects").select("owner_id,status").in("owner_id",ids):Promise.resolve({data:[]}),
    ids.length?db.from("follows").select("follower_id").in("follower_id",ids):Promise.resolve({data:[]}),
    ids.length?db.from("collections").select("user_id").in("user_id",ids):Promise.resolve({data:[]}),
    access.isSuperAdmin&&ids.length?db.from("admin_access").select("user_id,role,permissions,expires_at").in("user_id",ids):Promise.resolve({data:[]})
  ]);
  const adminAccessMap=new Map((adminAccessRows.data??[]).map(x=>[x.user_id,{role:x.role as AdminRole,permissions:(x.permissions??[]).filter(isAdminPermission),expiresAt:x.expires_at??null}]));
  const published=new Map<string,number>(),total=new Map<string,number>();
  for(const p of projects.data??[]){total.set(p.owner_id,(total.get(p.owner_id)||0)+1);if(p.status==="published")published.set(p.owner_id,(published.get(p.owner_id)||0)+1);}
  return <div className="admin-page">
    <div className="admin-heading"><p className="eyebrow">People / users</p><h1>Users.</h1><p>Account health, platform capabilities, verification and contribution levels.</p></div>
    <div className="admin-stat-grid admin-stat-grid-detailed admin-stat-grid-4">
      <div className="admin-kpi"><div className="admin-kpi-top"><span>Accounts</span><Users size={16}/></div><strong>{users?.length??0}</strong><small>latest 200</small></div>
      <div className="admin-kpi"><div className="admin-kpi-top"><span>Blocked</span><Ban size={16}/></div><strong>{users?.filter(u=>u.is_blocked).length??0}</strong><small>access disabled</small></div>
      <div className="admin-kpi"><div className="admin-kpi-top"><span>Verified</span><CheckCircle2 size={16}/></div><strong>{users?.filter(u=>u.verification_tier!=="none"||u.github_connected).length??0}</strong><small>manual or GitHub verification</small></div>
      <div className="admin-kpi"><div className="admin-kpi-top"><span>Admin</span><ShieldCheck size={16}/></div><strong>{(access.isSuperAdmin?1:0)+(adminAccessRows.data?.length??0)}</strong><small>platform administrators</small></div>
    </div>
    <section className="admin-card"><div className="admin-section-head"><div><p className="eyebrow">Account directory</p><h2>People & permissions</h2></div></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Tier</th><th>Projects</th><th>Capabilities</th><th>Joined</th><th>Verification</th>{access.isSuperAdmin&&<th>Admin access</th>}</tr></thead>
      <tbody>{users?.map(user=>{const count=published.get(user.id)||0;const tier=getProfileTier(count,user.verification_tier,user.github_connected);const accessRow=adminAccessMap.get(user.id);return <tr key={user.id}>
        <td><strong>{user.display_name||user.username||"Unnamed"}</strong><small>{user.username?"@"+user.username:user.id.slice(0,8)+"…"}</small></td>
        <td><span className={"admin-status "+(tier.label==="Member"?"neutral":tier.label==="Founder"?"success":tier.label==="Entrepreneur"?"info":"gold")}>{tier.label}{tier.isVerified?" ✓":""}</span><small>{user.verification_tier!=="none"?"Manual verification":user.github_connected?"GitHub verified":"Not verified"}</small></td>
        <td><strong>{count}</strong> published<small>{total.get(user.id)||0} total submissions</small></td>
        <td><div className="admin-capabilities"><span className={user.can_submit?"on":"off"}>Submit</span><span className={user.can_bid?"on":"off"}>Bid</span><span className={user.can_promote?"on":"off"}>Promote</span></div></td>
        <td>{new Date(user.created_at).toLocaleDateString("en-IN")}</td>
        <td>{(access.permissions.includes("users.verify")||access.isSuperAdmin)?<AdminUserVerification userId={user.id} initial={(["none","member","founder","entrepreneur","celebrity"] as const).includes(user.verification_tier as any)?user.verification_tier:"none"}/>:<small>View only</small>}</td>
        {access.isSuperAdmin&&<td>{user.id===currentAdmin.id?<span className="admin-platform-owner">Platform owner</span>:<AdminAccessEditor userId={user.id} userName={user.display_name||user.username||"Unnamed"} initial={accessRow??{role:null,permissions:[],expiresAt:null}}/>}</td>}
      </tr>})}</tbody></table>{!users?.length&&<div className="admin-empty">No users found.</div>}</div>
    </section>
  </div>;
}
