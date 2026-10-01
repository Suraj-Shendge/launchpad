"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminAccess } from "@/lib/admin-access";

export async function setReportStatus(formData: FormData) {
  const { user, access } = await getAdminAccess();
  if (!access.permissions.includes("reports.view") && !access.isSuperAdmin) throw new Error("You do not have permission.");
  const reportId = String(formData.get("report_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(reportId) || !["pending", "resolved"].includes(status)) throw new Error("Invalid report update.");
  const db = createAdminClient();
  const resolved = status === "resolved";
  const { error } = await db.from("comment_reports").update({
    status,
    resolved_at: resolved ? new Date().toISOString() : null,
    resolved_by: resolved ? user.id : null,
  }).eq("id", reportId);
  if (error) throw new Error(error.message);
  await db.from("admin_actions").insert({
    admin_id: user.id,
    action: resolved ? "report_resolved" : "report_reopened",
    target_type: "comment_report",
    target_id: reportId,
    metadata: { status },
  });
  revalidatePath("/admin/reports");
}
