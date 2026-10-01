"use client";

import { useRef, useState } from "react";
import { Camera, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Profile={display_name:string|null;username:string|null;bio:string|null;avatar_url:string|null;website_url:string|null;twitter_url:string|null;linkedin_url:string|null;github_url:string|null};

export function ProfileSettingsForm({profile}:{profile:Profile}){
 const router=useRouter();
 const fileRef=useRef<HTMLInputElement>(null);
 const [avatarUrl,setAvatarUrl]=useState(profile.avatar_url??"");
 const [values,setValues]=useState<Record<string,string>>({
  display_name:profile.display_name??"",username:profile.username??"",bio:profile.bio??"",
  website_url:profile.website_url??"",twitter_url:profile.twitter_url??"",linkedin_url:profile.linkedin_url??"",github_url:profile.github_url??""
 });
 const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false); const [avatarBusy,setAvatarBusy]=useState(false);

 const update=(key:string,value:string)=>setValues(v=>({...v,[key]:value}));

 async function uploadAvatar(file:File){
  if(!file.type.startsWith("image/")){setMessage("Please choose an image file.");return;}
  if(file.size>5*1024*1024){setMessage("Profile pictures must be 5 MB or smaller.");return;}
  setAvatarBusy(true);setMessage("");
  const supabase=createClient();
  const user=(await supabase.auth.getUser()).data.user;
  if(!user){setAvatarBusy(false);setMessage("Authentication required.");return;}
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
  const path=user.id+"/avatar."+ext;
  const {error:uploadError}=await supabase.storage.from("profile-images").upload(path,file,{upsert:true,contentType:file.type,cacheControl:"3600"});
  if(uploadError){setAvatarBusy(false);setMessage(uploadError.message);return;}
  const {data:publicData}=supabase.storage.from("profile-images").getPublicUrl(path);
  const nextUrl=publicData.publicUrl+"?v="+Date.now();
  const response=await fetch("/api/profile",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({avatar_url:nextUrl})});
  const payload=await response.json().catch(()=>({}));
  setAvatarBusy(false);
  if(!response.ok){setMessage(payload.error||"Could not update profile picture.");return;}
  setAvatarUrl(nextUrl);setMessage("Profile picture updated.");router.refresh();
 }

 async function save(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  const response=await fetch("/api/profile",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({...values,avatar_url:avatarUrl})});
  const payload=await response.json().catch(()=>({}));setBusy(false);
  setMessage(response.ok?"Profile saved.":(payload.error||"Could not save profile."));
  if(response.ok)router.refresh();
 }

 const name=values.display_name||values.username||"U";
 return <form className="profile-form" onSubmit={save}>
  <div className="profile-form-intro">
    <button type="button" className="profile-avatar-editor" onClick={()=>fileRef.current?.click()} disabled={avatarBusy} aria-label="Change profile picture">
      {avatarUrl?<img src={avatarUrl} alt="Current profile picture"/>:name.slice(0,1).toUpperCase()}
      <span><Camera size={15}/>{avatarBusy&&<LoaderCircle className="profile-avatar-spinner" size={13}/>}</span>
    </button>
    <input ref={fileRef} className="profile-avatar-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>{const file=e.target.files?.[0];if(file)void uploadAvatar(file);e.currentTarget.value=""}}/>
    <div><strong>Your public profile</strong><p>Click your profile picture to upload or change it. This information appears alongside your projects and community activity.</p></div>
  </div>
  <div className="form-grid"><label>Display name<input value={values.display_name} onChange={e=>update("display_name",e.target.value)} maxLength={60}/></label><label>Username<input value={values.username} onChange={e=>update("username",e.target.value.replace(/[^a-zA-Z0-9_-]/g,""))} maxLength={30}/></label></div>
  <label>Bio<span className="field-hint">A short introduction for other makers.</span><textarea value={values.bio} onChange={e=>update("bio",e.target.value)} maxLength={280} rows={5}/></label>
  <div className="profile-section-label">Links</div>
  <div className="profile-link-grid">
   <label>Website<input type="url" placeholder="https://" value={values.website_url} onChange={e=>update("website_url",e.target.value)}/></label>
   <label>GitHub<input type="url" placeholder="https://github.com/..." value={values.github_url} onChange={e=>update("github_url",e.target.value)}/></label>
   <label>LinkedIn<input type="url" placeholder="https://linkedin.com/in/..." value={values.linkedin_url} onChange={e=>update("linkedin_url",e.target.value)}/></label>
   <label>X / Twitter<input type="url" placeholder="https://x.com/..." value={values.twitter_url} onChange={e=>update("twitter_url",e.target.value)}/></label>
  </div>
  <div className="profile-form-actions"><button className="button-primary" disabled={busy||avatarBusy}>{busy?"Saving…":"Save profile"}</button>{message&&<p className="form-note" role="status">{message}</p>}</div>
 </form>;
}
