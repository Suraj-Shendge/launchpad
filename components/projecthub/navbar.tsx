import { createClient } from "@/lib/supabase/server";
import { NavbarClient } from "@/components/projecthub/navbar-client";
import { getProfileTier } from "@/lib/profile";
import { getOptionalAdminAccess } from "@/lib/admin-access";

export async function Navbar({authenticated:_authenticated=false}:{authenticated?:boolean}={}){
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return <NavbarClient user={null} unreadCount={0}/>;
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
 if(!user)return <NavbarClient user={null} unreadCount={0}/>;
 const [adminAccess,{data:profile},{count:publishedCount},{count:unreadCount}]=await Promise.all([
  getOptionalAdminAccess(),
  supabase.from("profiles").select("display_name,username,name,avatar_url,verification_tier,github_connected").eq("id",user.id).maybeSingle(),
  supabase.from("projects").select("id",{count:"exact",head:true}).eq("owner_id",user.id).eq("status","published"),
  supabase.from("notifications").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("read",false)
 ]);
 return <NavbarClient user={{
  id:user.id,
  displayName:profile?.display_name||profile?.name||user.user_metadata?.display_name||user.email?.split("@")[0]||"Member",
  username:profile?.username||user.email?.split("@")[0]||"member",
  avatarUrl:profile?.avatar_url||null,
  tier:getProfileTier(publishedCount??0,profile?.verification_tier,profile?.github_connected),
  isAdmin:Boolean(adminAccess)
 }} unreadCount={unreadCount??0}/>;
}
