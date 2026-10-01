import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { NotificationInbox } from "@/components/projecthub/notification-inbox";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export default async function Notifications(){
 if(!hasEnvVars)redirect("/login");
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login?next=/notifications");
 const [{data:notifications},{count:unreadCount}]=await Promise.all([
  supabase.from("notifications").select("id,type,title,message,link,reference_type,reference_id,read,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(60),
  supabase.from("notifications").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("read",false)
 ]);
 return <div><Navbar authenticated/><main className="section notifications-page">
  <div className="notifications-page-head"><div><p className="eyebrow">Activity</p><h1 className="section-title">Notifications.</h1><p className="section-copy">Updates from people and forums you follow, plus activity around your projects.</p></div>{Number(unreadCount??0)>0&&<span className="notification-unread-summary">{unreadCount} unread</span>}</div>
  <section className="notifications-card"><div className="notifications-card-head"><span><Bell size={16}/>Inbox</span><span>{notifications?.length??0} recent</span></div><NotificationInbox initial={notifications??[]}/></section>
 </main><Footer/></div>;
}
