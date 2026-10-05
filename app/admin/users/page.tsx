import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { AdminUserVerification } from "@/components/projecthub/admin-user-verification";
import { AdminAccessEditor } from "@/components/projecthub/admin-access-editor";
import { getAdminAccess, isAdminPermission, type AdminRole } from "@/lib/admin-access";
import { getProfileTier } from "@/lib/profile";
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, Search, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 100;
type Params = Promise<{ q?: string; page?: string }>;

function cleanSearch(value: string) {
  return value.replace(/[^a-zA-Z0-9@._+\- ]/g, " ").trim().slice(0, 80);
}

export default async function AdminUsers({ searchParams }: { searchParams: Params }) {
  await requireAdmin("users.view");
  const { access, user: currentAdmin } = await getAdminAccess();
  const db = createAdminClient();
  const params = await searchParams;
  const q = cleanSearch(params.q ?? "");
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const requestedPage = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;

  let usersQuery = db.from("profiles")
    .select("id,display_name,username,verification_tier,github_connected,created_at,is_admin,is_blocked,can_submit,can_bid,can_promote", { count: "exact" });
  let blockedQuery = db.from("profiles").select("id", { count: "exact", head: true }).eq("is_blocked", true);
  let verifiedQuery = db.from("profiles").select("id", { count: "exact", head: true })
    .or("verification_tier.neq.none,github_connected.eq.true");

  if (q) {
    const search = `display_name.ilike.%${q}%,username.ilike.%${q}%`;
    usersQuery = usersQuery.or(search);
    blockedQuery = blockedQuery.or(search);
    verifiedQuery = verifiedQuery.or(search);
  }

  const [{ data: queriedUsers, count: userCount }, { count: blockedCount }, { count: verifiedCount }, { count: adminCount }] =
    await Promise.all([
      usersQuery.order("created_at", { ascending: false }).range((requestedPage - 1) * PAGE_SIZE, requestedPage * PAGE_SIZE - 1),
      blockedQuery,
      verifiedQuery,
      db.from("admin_access").select("user_id", { count: "exact", head: true }),
    ]);

  const totalPages = Math.max(1, Math.ceil((userCount ?? 0) / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const users = page === requestedPage
    ? queriedUsers ?? []
    : ((await (async () => {
        let retry = db.from("profiles").select("id,display_name,username,verification_tier,github_connected,created_at,is_admin,is_blocked,can_submit,can_bid,can_promote");
        if (q) retry = retry.or(`display_name.ilike.%${q}%,username.ilike.%${q}%`);
        return retry.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      })()).data ?? []);

  const ids = users.map((u) => u.id);
  const [projects, adminAccessRows] = await Promise.all([
    ids.length ? db.from("projects").select("owner_id,status").in("owner_id", ids) : Promise.resolve({ data: [] }),
    access.isSuperAdmin && ids.length
      ? db.from("admin_access").select("user_id,role,permissions,expires_at").in("user_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  const adminAccessMap = new Map(
    (adminAccessRows.data ?? []).map((x) => [
      x.user_id,
      {
        role: x.role as AdminRole,
        permissions: (x.permissions ?? []).filter(isAdminPermission),
        expiresAt: x.expires_at ?? null,
      },
    ]),
  );
  const published = new Map<string, number>();
  const total = new Map<string, number>();
  for (const p of projects.data ?? []) {
    total.set(p.owner_id, (total.get(p.owner_id) || 0) + 1);
    if (p.status === "published") published.set(p.owner_id, (published.get(p.owner_id) || 0) + 1);
  }

  const pageUrl = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (target > 1) sp.set("page", String(target));
    const query = sp.toString();
    return `/admin/users${query ? "?" + query : ""}`;
  };

  const start = userCount ? (page - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(page * PAGE_SIZE, userCount ?? 0);

  return (
    <div className="admin-page">
      <div className="admin-heading">
        <p className="eyebrow">People / users</p>
        <h1>Users.</h1>
        <p>Account health, platform capabilities, verification and contribution levels.</p>
      </div>

      <div className="admin-stat-grid admin-stat-grid-detailed admin-stat-grid-4">
        <div className="admin-kpi"><div className="admin-kpi-top"><span>Accounts</span><Users size={16}/></div><strong>{userCount ?? 0}</strong><small>{q ? "matching" : "all accounts"}</small></div>
        <div className="admin-kpi"><div className="admin-kpi-top"><span>Blocked</span><Ban size={16}/></div><strong>{blockedCount ?? 0}</strong><small>access disabled</small></div>
        <div className="admin-kpi"><div className="admin-kpi-top"><span>Verified</span><CheckCircle2 size={16}/></div><strong>{verifiedCount ?? 0}</strong><small>manual or GitHub verification</small></div>
        <div className="admin-kpi"><div className="admin-kpi-top"><span>Admin</span><ShieldCheck size={16}/></div><strong>{(adminCount ?? 0) + (access.isSuperAdmin ? 1 : 0)}</strong><small>platform administrators</small></div>
      </div>

      <section className="admin-card">
        <div className="admin-section-head">
          <div><p className="eyebrow">Account directory</p><h2>People & permissions</h2></div>
        </div>

        <form className="search-bar admin-search" action="/admin/users" method="get">
          <Search size={17}/>
          <input name="q" defaultValue={q} placeholder="Search users by name or username..." aria-label="Search users"/>
          {q && <Link className="admin-search-clear" href="/admin/users">Clear</Link>}
          <button type="submit">Search</button>
        </form>

        {q && <p className="admin-search-summary">Showing {userCount ?? 0} users matching <strong>{q}</strong>.</p>}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>User</th><th>Tier</th><th>Projects</th><th>Capabilities</th><th>Joined</th><th>Verification</th>{access.isSuperAdmin && <th>Admin access</th>}</tr></thead>
            <tbody>
              {users.map((user) => {
                const count = published.get(user.id) || 0;
                const tier = getProfileTier(count, user.verification_tier, user.github_connected);
                const accessRow = adminAccessMap.get(user.id);
                return (
                  <tr key={user.id}>
                    <td><strong>{user.display_name || user.username || "Unnamed"}</strong><small>{user.username ? "@" + user.username : user.id.slice(0, 8) + "…"}</small></td>
                    <td><span className={"admin-status " + (tier.label === "Member" ? "neutral" : tier.label === "Founder" ? "success" : tier.label === "Entrepreneur" ? "info" : "gold")}>{tier.label}{tier.isVerified ? " ✓" : ""}</span><small>{user.verification_tier !== "none" ? "Manual verification" : user.github_connected ? "GitHub verified" : "Not verified"}</small></td>
                    <td><strong>{count}</strong> published<small>{total.get(user.id) || 0} total submissions</small></td>
                    <td><div className="admin-capabilities"><span className={user.can_submit ? "on" : "off"}>Submit</span><span className={user.can_bid ? "on" : "off"}>Bid</span><span className={user.can_promote ? "on" : "off"}>Promote</span></div></td>
                    <td>{new Date(user.created_at).toLocaleDateString("en-IN")}</td>
                    <td>{(access.permissions.includes("users.verify") || access.isSuperAdmin) ? <AdminUserVerification userId={user.id} initial={(["none", "member", "founder", "entrepreneur", "celebrity"] as const).includes(user.verification_tier as any) ? user.verification_tier : "none"}/> : <small>View only</small>}</td>
                    {access.isSuperAdmin && <td>{user.id === currentAdmin.id ? <span className="admin-platform-owner">Platform owner</span> : <AdminAccessEditor userId={user.id} userName={user.display_name || user.username || "Unnamed"} initial={accessRow ?? { role: null, permissions: [], expiresAt: null }}/>}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!users.length && <div className="admin-empty">{q ? "No users match this search." : "No users found."}</div>}
        </div>

        <div className="admin-pagination">
          <div><strong>{start}–{end}</strong><span>of {userCount ?? 0} users</span><small>Page {page} of {totalPages}</small></div>
          <div className="admin-pagination-actions">
            {page > 1 ? <Link href={pageUrl(page - 1)} className="admin-page-button"><ChevronLeft size={15}/>Previous</Link> : <span className="admin-page-button is-disabled"><ChevronLeft size={15}/>Previous</span>}
            {page < totalPages ? <Link href={pageUrl(page + 1)} className="admin-page-button">Next<ChevronRight size={15}/></Link> : <span className="admin-page-button is-disabled">Next<ChevronRight size={15}/></span>}
          </div>
        </div>
      </section>
    </div>
  );
}
