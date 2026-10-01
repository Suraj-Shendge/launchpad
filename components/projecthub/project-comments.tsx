"use client";

import { useMemo, useState } from "react";
import { CornerDownRight, Heart, Loader2, MessageCircle, Pencil, Send, Flag, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type CommentProfile = {
 id: string;
 username: string | null;
 display_name: string | null;
 avatar_url: string | null;
 verification_tier?: string | null;
};

export type ProjectComment = {
 id: string;
 project_id: string;
 user_id: string;
 parent_id: string | null;
 content: string;
 created_at: string;
 updated_at: string;
 is_founder_reply: boolean;
 like_count: number;
 user_liked?: boolean;
 profile?: CommentProfile | null;
};

type Props = {
 projectId: string;
 initialComments: ProjectComment[];
 viewerId: string | null;
 viewerProfile: CommentProfile | null;
};

const reportReasons=[
 ["spam","Spam or promotion"],
 ["harassment","Harassment or bullying"],
 ["scam","Scam or misleading content"],
 ["inappropriate","Inappropriate content"],
 ["copyright","Copyright or impersonation"],
 ["other","Other"],
] as const;function displayName(profile?: CommentProfile | null) {
 return profile?.display_name || profile?.username || "Member";
}

function timeAgo(value: string) {
 const seconds=Math.max(1,Math.floor((Date.now()-new Date(value).getTime())/1000));
 if(seconds<60)return "just now";
 if(seconds<3600)return Math.floor(seconds/60)+"m ago";
 if(seconds<86400)return Math.floor(seconds/3600)+"h ago";
 if(seconds<604800)return Math.floor(seconds/86400)+"d ago";
 return new Date(value).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}

export function ProjectComments({projectId,initialComments,viewerId,viewerProfile}:Props){
 const [comments,setComments]=useState(initialComments);
 const [draft,setDraft]=useState("");
 const [replyTo,setReplyTo]=useState<string|null>(null);
 const [editing,setEditing]=useState<string|null>(null);
 const [editDraft,setEditDraft]=useState("");
 const [busy,setBusy]=useState(false);
 const [likedIds,setLikedIds]=useState(()=>new Set(initialComments.filter(c=>c.user_liked).map(c=>c.id)));
 const [reportingId,setReportingId]=useState<string|null>(null);
 const [reportReason,setReportReason]=useState("spam");
 const [reportDescription,setReportDescription]=useState("");
 const [reportBusy,setReportBusy]=useState(false);
 const [reportMessage,setReportMessage]=useState("");
 const topLevel=useMemo(()=>comments.filter(c=>!c.parent_id),[comments]);
 const replies=useMemo(()=>comments.filter(c=>c.parent_id),[comments]);

 async function requireUser(){
  const supabase=createClient();
  const {data}=await supabase.auth.getUser();
  if(!data.user){
   window.location.href="/login?next="+encodeURIComponent(window.location.pathname);
   return null;
  }
  return {supabase,user:data.user};
 } async function submit(){
  const content=draft.trim();
  if(!content||busy)return;
  setBusy(true);
  const auth=await requireUser();
  if(!auth){setBusy(false);return;}
  const {data,error}=await auth.supabase.from("project_comments").insert({
   project_id:projectId,user_id:auth.user.id,parent_id:replyTo,content
  }).select("id,project_id,user_id,parent_id,content,created_at,updated_at,is_founder_reply,like_count").single();
  if(!error&&data){
   setComments(v=>[...v,{...data,profile:viewerProfile,user_liked:false}]);
   setDraft("");
   setReplyTo(null);
  }
  setBusy(false);
 }

 async function saveEdit(id:string){
  const content=editDraft.trim();
  if(!content||busy)return;
  setBusy(true);
  const auth=await requireUser();
  if(!auth){setBusy(false);return;}
  const {data,error}=await auth.supabase.from("project_comments").update({content,updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",auth.user.id).select("id,content,updated_at").single();
  if(!error&&data){
   setComments(v=>v.map(c=>c.id===id?{...c,content:data.content,updated_at:data.updated_at}:c));
   setEditing(null);
   setEditDraft("");
  }
  setBusy(false);
 } async function remove(id:string){
  if(busy)return;
  if(!window.confirm("Delete this comment?"))return;
  setBusy(true);
  const auth=await requireUser();
  if(!auth){setBusy(false);return;}
  const {error}=await auth.supabase.from("project_comments").delete().eq("id",id).eq("user_id",auth.user.id);
  if(!error){
   setComments(v=>v.filter(c=>c.id!==id&&c.parent_id!==id));
   setLikedIds(v=>{const next=new Set(v);next.delete(id);return next;});
  }
  setBusy(false);
 }

 async function toggleLike(comment:ProjectComment){
  const auth=await requireUser();
  if(!auth)return;
  const currentlyLiked=likedIds.has(comment.id);
  const {data,error}=await auth.supabase.rpc("toggle_comment_like",{p_comment_id:comment.id});
  if(error)return;
  const nextLiked=Boolean(data);
  setLikedIds(v=>{const next=new Set(v);nextLiked?next.add(comment.id):next.delete(comment.id);return next;});
  setComments(v=>v.map(c=>c.id===comment.id?{...c,like_count:Math.max(0,c.like_count+(nextLiked&&!currentlyLiked?1:!nextLiked&&currentlyLiked?-1:0))}:c));
 } async function submitReport(commentId:string){
  if(reportBusy)return;
  setReportBusy(true);
  const auth=await requireUser();
  if(!auth){setReportBusy(false);return;}
  const {error}=await auth.supabase.from("comment_reports").insert({
   comment_id:commentId,reporter_id:auth.user.id,reason:reportReason,description:reportDescription.trim()||null
  });
  if(error?.code==="23505")setReportMessage("You already reported this comment.");
  else if(error)setReportMessage("Could not submit the report. Please try again.");
  else{
   setReportMessage("Report submitted.");
   setReportDescription("");
   window.setTimeout(()=>{setReportingId(null);setReportMessage("")},1200);
  }
  setReportBusy(false);
 }

 function startReply(comment:ProjectComment){
  setReplyTo(comment.id);
  setDraft("");
  setEditing(null);
  setReportingId(null);
  document.getElementById("project-comment-composer")?.scrollIntoView({behavior:"smooth",block:"center"});
 }

 function startEdit(comment:ProjectComment){
  setEditing(comment.id);
  setEditDraft(comment.content);
  setReplyTo(null);
  setReportingId(null);
 }

 function startReport(commentId:string){
  setReportingId(v=>v===commentId?null:commentId);
  setReportReason("spam");
  setReportDescription("");
  setReportMessage("");
 } function renderComment(comment:ProjectComment,reply=false){
  const mine=viewerId===comment.user_id;
  const childReplies=replies.filter(c=>c.parent_id===comment.id);
  const liked=likedIds.has(comment.id);
  return <article className={"project-comment"+(reply?" is-reply":"")} key={comment.id}>
   <div className="project-comment-avatar">{comment.profile?.avatar_url?<img src={comment.profile.avatar_url} alt=""/>:displayName(comment.profile).slice(0,1).toUpperCase()}</div>
   <div className="project-comment-main">
    <div className="project-comment-head"><strong>{displayName(comment.profile)}</strong>{comment.profile?.username&&<span>@{comment.profile.username}</span>}{comment.is_founder_reply&&<small>Founder</small>}<time>{timeAgo(comment.created_at)}</time></div>
    {editing===comment.id?<div className="project-comment-edit"><textarea value={editDraft} onChange={e=>setEditDraft(e.target.value)} maxLength={2000}/><div><button type="button" onClick={()=>{setEditing(null);setEditDraft("")}}><X size={13}/>Cancel</button><button type="button" className="button-primary" disabled={busy||!editDraft.trim()} onClick={()=>saveEdit(comment.id)}>Save</button></div></div>:<p>{comment.content}</p>}
    {editing!==comment.id&&<div className="project-comment-actions">
      <button type="button" className={liked?"is-liked":""} onClick={()=>toggleLike(comment)}><Heart size={13} fill={liked?"currentColor":"none"}/>{comment.like_count>0&&<span>{comment.like_count}</span>}<span>Like</span></button>
      <button type="button" onClick={()=>startReply(comment)}><CornerDownRight size={13}/>Reply</button>
      {!mine&&viewerId&&<button type="button" onClick={()=>startReport(comment.id)}><Flag size={13}/>Report</button>}
      {mine&&<><button type="button" onClick={()=>startEdit(comment)}><Pencil size={13}/>Edit</button><button type="button" onClick={()=>remove(comment.id)}><Trash2 size={13}/>Delete</button></>}
    </div>}
    {reportingId===comment.id&&<div className="project-comment-report">
      <div className="project-comment-report-head"><strong>Report comment</strong><button type="button" onClick={()=>setReportingId(null)}><X size={13}/></button></div>
      <select value={reportReason} onChange={e=>setReportReason(e.target.value)}>{reportReasons.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      <textarea value={reportDescription} onChange={e=>setReportDescription(e.target.value)} maxLength={500} placeholder="Add context (optional)"/>
      <div className="project-comment-report-footer"><span>{reportMessage||"Help us understand the issue."}</span><button type="button" className="button-primary" disabled={reportBusy} onClick={()=>submitReport(comment.id)}>{reportBusy?<Loader2 size={13} className="spin"/>:<Flag size={13}/>}Submit report</button></div>
    </div>}
    {childReplies.length>0&&<div className="project-comment-replies">{childReplies.map(child=>renderComment(child,true))}</div>}
   </div>
  </article>;
 } return <section className="section project-comments-section" id="project-comments">
  <div className="project-comments-head"><div><p className="eyebrow">Discussion</p><h2>Comments</h2></div><span>{comments.length} {comments.length===1?"comment":"comments"}</span></div>
  <div className="project-comments-card">
   {viewerId?<div className="project-comment-composer" id="project-comment-composer">
    <div className="project-comment-avatar">{viewerProfile?.avatar_url?<img src={viewerProfile.avatar_url} alt=""/>:displayName(viewerProfile).slice(0,1).toUpperCase()}</div>
    <div className="project-comment-compose-main">{replyTo&&<div className="project-comment-replying">Replying to a comment <button type="button" onClick={()=>setReplyTo(null)}><X size={12}/></button></div>}
     <textarea value={draft} onChange={e=>setDraft(e.target.value)} maxLength={2000} placeholder={replyTo?"Write a reply...":"Share your thoughts about this project..."}/>
     <div className="project-comment-compose-footer"><span>{draft.length}/2000</span><button type="button" className="button-primary" disabled={busy||!draft.trim()} onClick={submit}>{busy?<Loader2 size={14} className="spin"/>:<Send size={14}/>}Post {replyTo?"Reply":"Comment"}</button></div>
    </div>
   </div>:<div className="project-comments-login"><MessageCircle size={17}/><div><strong>Join the discussion</strong><span>Sign in to leave a comment or reply.</span></div><a className="button-outline" href={"/login?next="+encodeURIComponent(window.location.pathname)}>Sign in</a></div>}
   <div className="project-comment-list">{topLevel.length?topLevel.map(c=>renderComment(c)): <div className="project-comments-empty"><MessageCircle size={20}/><strong>No comments yet</strong><span>Be the first to start the discussion.</span></div>}</div>
  </div>
 </section>;
}
