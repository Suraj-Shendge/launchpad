"use client";

import { useState } from "react";
import { Bell, CheckCheck, Gavel, MessageCircle, Rocket, ThumbsUp, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Notification={id:string;type:string;title:string;message:string;link:string|null;reference_type:string|null;reference_id:string|null;read:boolean;created_at:string};

function timeAgo(value:string){
 const seconds=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000));
 if(seconds<60)return"just now"; const minutes=Math.floor(seconds/60); if(minutes<60)return minutes+"m ago";
 const hours=Math.floor(minutes/60); if(hours<24)return hours+"h ago"; const days=Math.floor(hours/24); if(days<30)return days+"d ago";
 return Math.floor(days/30)+"mo ago";
}

function Icon({type}:{type:string}){
 if(type==="new_follower")return <UserPlus size={15}/>;
 if(type==="project_upvote")return <ThumbsUp size={15}/>;
 if(type==="followed_user_project")return <Rocket size={15}/>;
 if(type.startsWith("auction_"))return <Gavel size={15}/>;
 if(type.startsWith("community_"))return <MessageCircle size={15}/>;
 return <Bell size={15}/>;
}
export function NotificationInbox({initial}:{initial:Notification[]}){
 const [items,setItems]=useState(initial); const [busy,setBusy]=useState(false); const router=useRouter();
 const unread=items.filter(item=>!item.read).length;

 async function markRead(id:string){
  const item=items.find(n=>n.id===id); if(!item)return;
  if(!item.read)await createClient().from("notifications").update({read:true}).eq("id",id);
  setItems(current=>current.map(n=>n.id===id?{...n,read:true}:n));
  if(item.link)router.push(item.link);
 }
 async function markAll(){
  if(!unread||busy)return; setBusy(true);
  const ids=items.filter(n=>!n.read).map(n=>n.id);
  await createClient().from("notifications").update({read:true}).in("id",ids);
  setItems(current=>current.map(n=>({...n,read:true}))); setBusy(false);
 }
 return <div className="notification-inbox">
  <div className="notification-toolbar">{unread>0?<span>{unread} unread</span>:<span>All caught up</span>}{unread>0&&<button type="button" onClick={markAll} disabled={busy}><CheckCheck size={14}/>{busy?"Marking…":"Mark all as read"}</button>}</div>  {items.length?<div className="notification-list">{items.map(item=><button key={item.id} type="button" className={"notification-item"+(item.read?"":" is-unread")} onClick={()=>markRead(item.id)}>
   <span className="notification-item-icon"><Icon type={item.type}/></span>
   <span className="notification-item-copy"><strong>{item.title}</strong><span>{item.message}</span><small>{timeAgo(item.created_at)}</small></span>
   {!item.read&&<i aria-label="Unread"/>}
  </button>)}</div>:<div className="notification-empty"><Bell size={20}/><strong>No notifications yet.</strong><span>Follow makers and forums to see useful activity here.</span></div>}
 </div>;
}
