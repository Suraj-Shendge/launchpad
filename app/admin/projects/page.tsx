import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { getAdminAccess } from "@/lib/admin-access";
import { AdminProjectActions } from "@/components/projecthub/admin-project-actions";
import { Archive, CheckCircle2, ChevronLeft, ChevronRight, Clock3, FolderKanban, Search, XCircle } from "lucide-react";

const PAGE_SIZE = 100;
type Params = Promise<{ q?: string; page?: string }>;

function cleanSearch(value: string) {
  return value.replace(/[^a-zA-Z0-9@._+\- ]/g, " ").trim().slice(0, 80);
}

export default async function AdminProjects({ searchParams }: { searchParams: Params }) {
  await requireAdmin("projects.view");
  const { access } = await getAdminAccess();
  const db = createAdminClient();
  const params = await searchParams;
  const q = cleanSearch(params.q ?? "");
  const parsedPage = Number.parseInt(params.page ?? "1", 10);
  const requestedPage = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;

  let ownerIds: string[] = [];
  if (q) {
    const { data: matchingOwners } = await db.from("profiles").select("id").or(`display_name.ilike.%${q}%,username.ilike.%${q}%`).limit(1000);
    ownerIds = (matchingOwners ?? []).map((x) => x.id);
  }

  const clauses = q
    ? [
        `name.ilike.%${q}%`,
        `slug.ilike.%${q}%`,
        `tagline.ilike.%${q}%`,
        `github_url.ilike.%${q}%`,
        `website_url.ilike.%${q}%`,
        ...(ownerIds.length ? [`owner_id.in.(${ownerIds.join(",")})`] : []),
      ].join(",")
    : null;

  let projectsQuery = db.from("projects")
    .select("id,name,slug,status,created_at,updated_at,owner_id,category_id,tagline,rejection_reason,is_verified,published_at,moderated_by", { count: "exact" });

  const statusQueries = {
    pending: db.from("projects").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    published: db.from("projects").select("id", { count: "exact", head: true }).eq("status", "published"),
    rejected: db.from("projects").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    archived: db.from("projects").select("id", { count: "exact", head: true }).eq("status", "archived"),
  };

  if (clauses) {
    projectsQuery = projectsQuery.or(clauses);
    for (const query of Object.values(statusQueries)) query.or(clauses);
  }

  const [{ data, count: projectCount }, statusResults] = await Promise.all([
    projectsQuery.order("created_at", { ascending: false }).range((requestedPage - 1) * PAGE_SIZE, requestedPage * PAGE_SIZE - 1),
    Promise.all(Object.values(statusQueries)),
  ]);

  const totalPages = Math.max(1, Math.ceil((projectCount ?? 0) / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const rows = page === requestedPage
    ? data ?? []
    : ((await (async () => {
        let retry = db.from("projects").select("id,name,slug,status,created_at,updated_at,owner_id,category_id,tagline,rejection_reason,is_verified,published_at,moderated_by");
        if (clauses) retry = retry.or(clauses);
        return retry.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      })()).data ?? []);

  const owners = [...new Set(rows.map((x) => x.owner_id))];
  const ids = rows.map((x) => x.id);
  const [profiles, views, clicks, verifications] = await Promise.all([
    owners.length ? db.from("profiles").select("id,display_name,username,verification_tier").in("id", owners) : Promise.resolve({ data: [] }),
    ids.length ? db.from("project_views").select("project_id").in("project_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? db.from("project_clicks").select("project_id").in("project_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? db.from("project_verifications").select("project_id,overall_status,github_status,website_status,provenance_status,cross_link_status").in("project_id", ids) : Promise.resolve({ data: [] }),
  ]);

  const verificationMap = new Map((verifications.data ?? []).map((x) => [x.project_id, x]));
  const ownerMap = new Map((profiles.data ?? []).map((x) => [x.id, x]));
  const viewMap = new Map<string, number>(), clickMap = new Map<string, number>();
  for (const x of views.data ?? []) viewMap.set(x.project_id, (viewMap.get(x.project_id) || 0) + 1);
  for (const x of clicks.data ?? []) clickMap.set(x.project_id, (clickMap.get(x.project_id) || 0) + 1);

  const pageUrl = (target: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (target > 1) sp.set("page", String(target));
    const query = sp.toString();
    return `/admin/projects${query ? "?" + query : ""}`;
  };

  const start = projectCount ? (page - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(page * PAGE_SIZE, projectCount ?? 0);
  const [pendingResult, publishedResult, rejectedResult, archivedResult] = statusResults;
  const status = (s: string) => s === "published" ? "success" : s === "pending_review" ? "warning" : s === "rejected" ? "danger" : "neutral";

  return (
    <div className="admin-page">
      <div className="admin-heading"><div><p className="eyebrow">Moderation / projects</p><h1>Projects.</h1><p>Full project inventory with publication state, owner identity, moderation metadata and engagement.</p></div><Link href="/launch" className="text-link">View launch flow →</Link></div>

      <div className="admin-stat-grid admin-stat-grid-detailed admin-stat-grid-5">
        <div className="admin-kpi"><div className="admin-kpi-top"><span>All</span><FolderKanban size={16}/></div><strong>{projectCount ?? 0}</strong><small>{q ? "matching" : "all projects"}</small></div>
        <div className="admin-kpi"><div className="admin-kpi-top"><span>Pending</span><Clock3 size={16}/></div><strong>{pendingResult.count ?? 0}</strong><small>awaiting review</small></div>
        <div className="admin-kpi"><div className="admin-kpi-top"><span>Published</span><CheckCircle2 size={16}/></div><strong>{publishedResult.count ?? 0}</strong><small>public projects</small></div>
        <div className="admin-kpi"><div className="admin-kpi-top"><span>Rejected</span><XCircle size={16}/></div><strong>{rejectedResult.count ?? 0}</strong><small>needs changes</small></div>
        <div className="admin-kpi"><div className="admin-kpi-top"><span>Archived</span><Archive size={16}/></div><strong>{archivedResult.count ?? 0}</strong><small>not active</small></div>
      </div>

      <section className="admin-card">
        <div className="admin-section-head"><div><p className="eyebrow">Inventory</p><h2>Project moderation</h2></div></div>

        <form className="search-bar admin-search" action="/admin/projects" method="get">
          <Search size={17}/>
          <input name="q" defaultValue={q} placeholder="Search projects by name, slug, owner or URL..." aria-label="Search projects"/>
          {q && <Link className="admin-search-clear" href="/admin/projects">Clear</Link>}
          <button type="submit">Search</button>
        </form>

        {q && <p className="admin-search-summary">Showing {projectCount ?? 0} projects matching <strong>{q}</strong>.</p>}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Project</th><th>Owner</th><th>State</th><th>Engagement</th><th>Ownership</th><th>Moderation</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map((p) => {
                const owner = ownerMap.get(p.owner_id);
                const verification = verificationMap.get(p.id);
                return (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong><small>{p.tagline || p.slug}</small></td>
                    <td><strong>{owner?.display_name || owner?.username || "Unknown"}</strong><small>{owner?.username ? "@" + owner.username : "No username"}</small></td>
                    <td><span className={"admin-status " + status(p.status)}>{p.status.replace("_", " ")}</span>{p.is_verified && <small>Verified project</small>}</td>
                    <td><strong>{viewMap.get(p.id) || 0}</strong> views<small>{clickMap.get(p.id) || 0} clicks</small></td>
                    <td>{verification ? <><span className={"admin-status " + (verification.overall_status === "verified" ? "success" : verification.overall_status === "review_required" ? "danger" : "warning")}>{verification.overall_status?.replaceAll("_", " ")}</span><small>GH {verification.github_status} · Web {verification.website_status}</small><small>{verification.provenance_status === "fork" ? "Fork detected" : verification.cross_link_status === "verified" ? "Cross-link matched" : "Checks pending"}</small></> : <span className="admin-status warning">not checked</span>}</td>
                    <td><small>Created {new Date(p.created_at).toLocaleDateString("en-IN")}</small><small>{p.moderated_by ? "Moderated" : "Not moderated"}</small></td>
                    <td><AdminProjectActions id={p.id} status={p.status} canApprove={access.permissions.includes("projects.approve") || access.isSuperAdmin} canPublish={access.permissions.includes("projects.publish") || access.isSuperAdmin}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length && <div className="admin-empty">{q ? "No projects match this search." : "No projects found."}</div>}
        </div>

        <div className="admin-pagination">
          <div><strong>{start}–{end}</strong><span>of {projectCount ?? 0} projects</span><small>Page {page} of {totalPages}</small></div>
          <div className="admin-pagination-actions">
            {page > 1 ? <Link href={pageUrl(page - 1)} className="admin-page-button"><ChevronLeft size={15}/>Previous</Link> : <span className="admin-page-button is-disabled"><ChevronLeft size={15}/>Previous</span>}
            {page < totalPages ? <Link href={pageUrl(page + 1)} className="admin-page-button">Next<ChevronRight size={15}/></Link> : <span className="admin-page-button is-disabled">Next<ChevronRight size={15}/></span>}
          </div>
        </div>
      </section>
    </div>
  );
}
