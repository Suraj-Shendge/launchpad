import { requireAdmin } from "@/lib/auth";
import { getAdminAccess } from "@/lib/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminSettingsForm } from "@/components/projecthub/admin-settings-form";

export default async function AdminSettings(){
 await requireAdmin("settings.view"); const {access}=await getAdminAccess(); const admin=createAdminClient();
 const {data}=await admin.from("settings").select("key,value").order("key");
 const editable=(data??[]).filter(s=>!["winner_payment_window_hours"].includes(s.key));
 return <div className="admin-page"><p className="eyebrow">Admin</p><h1>Commercial settings.</h1><p className="admin-lead">Keep prices, increments and durations configurable instead of embedding them in the UI.</p><AdminSettingsForm items={editable} canEdit={access.permissions.includes("settings.edit")||access.isSuperAdmin}/></div>;
}
