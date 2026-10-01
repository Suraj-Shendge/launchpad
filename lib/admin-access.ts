import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";
import { ADMIN_ALL_PERMISSIONS, type AdminPermission, type AdminRole, isAdminPermission } from "@/lib/admin-permissions";

export { ADMIN_PERMISSION_GROUPS, ADMIN_ROLE_PRESETS, ADMIN_ROLE_LABELS } from "@/lib/admin-permissions";
export type { AdminPermission, AdminRole } from "@/lib/admin-permissions";
export { isAdminPermission } from "@/lib/admin-permissions";
export const PLATFORM_ADMIN_USER_ID="d8243968-3167-4eaf-965b-39fdd15d669f";
export type AdminAccess={role:AdminRole;permissions:AdminPermission[];expiresAt:string|null;isSuperAdmin:boolean};

async function resolveAdminAccess(){
 if(!hasEnvVars)return {supabase:null,user:null,access:null as AdminAccess|null};
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {supabase,user:null,access:null as AdminAccess|null};
 if(user.id===PLATFORM_ADMIN_USER_ID)return {supabase,user,access:{role:"admin",permissions:ADMIN_ALL_PERMISSIONS,expiresAt:null,isSuperAdmin:true} as AdminAccess};
 const {data}=await supabase.from("admin_access").select("role,permissions,expires_at").eq("user_id",user.id).maybeSingle();
 if(!data)return {supabase,user,access:null as AdminAccess|null};
 if(data.expires_at&&new Date(data.expires_at)<=new Date())return {supabase,user,access:null as AdminAccess|null};
 return {supabase,user,access:{role:data.role as AdminRole,permissions:(Array.isArray(data.permissions)?data.permissions:[]).filter(isAdminPermission),expiresAt:data.expires_at??null,isSuperAdmin:false}};
}

export async function getAdminAccess(){const result=await resolveAdminAccess();if(!result.user||!result.access)redirect("/");return result as {supabase:NonNullable<typeof result.supabase>;user:NonNullable<typeof result.user>;access:AdminAccess};}
export async function requireAdmin(permission?:AdminPermission){const result=await resolveAdminAccess();if(!result.user||!result.access)redirect("/");if(permission&&!result.access.permissions.includes(permission))redirect("/");return result.supabase!;}
export async function requireAdminApi(permission?:AdminPermission){const result=await resolveAdminAccess();if(!result.user||!result.access)return {error:NextResponse.json({error:"Administrator access required."},{status:403})};if(permission&&!result.access.permissions.includes(permission))return {error:NextResponse.json({error:"You do not have permission for this action."},{status:403})};return {supabase:result.supabase!,user:result.user,access:result.access};}
