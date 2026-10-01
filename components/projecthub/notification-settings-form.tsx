"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Preferences={
 email_new_follower:boolean;email_new_comment:boolean;email_new_vote:boolean;email_new_review:boolean;email_weekly_digest:boolean;
 push_new_follower:boolean;push_new_comment:boolean;push_new_vote:boolean;push_new_review:boolean;push_weekly_digest:boolean;
};

const emailItems=[["email_new_follower","New followers","When someone follows your profile."],["email_new_comment","New comments","When someone comments on your project."],["email_new_vote","New votes","When your project receives a vote."],["email_new_review","New reviews","Saved for future email delivery when email notifications are enabled."],["email_weekly_digest","Weekly digest","A weekly summary of activity on your account."]] as const;
const pushItems=[["push_new_follower","New followers","Saved for future push delivery when push notifications are enabled."],["push_new_comment","New comments","Saved for future push delivery when push notifications are enabled."],["push_new_vote","New votes","Saved for future push delivery when push notifications are enabled."],["push_new_review","New reviews","Saved for future push delivery when push notifications are enabled."],["push_weekly_digest","Weekly digest","Saved for future push delivery when push notifications are enabled."]] as const;

export function NotificationSettingsForm({initial}:{initial:Preferences}){
 const [values,setValues]=useState(initial); const [busy,setBusy]=useState(false); const [message,setMessage]=useState("");
 function toggle(key:keyof Preferences){setValues(v=>({...v,[key]:!v[key]}));}
 async function save(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  const supabase=createClient();
  const {error}=await supabase.from("notification_preferences").upsert({user_id:(await supabase.auth.getUser()).data.user?.id,...values,updated_at:new Date().toISOString()});
  setBusy(false);setMessage(error?"Could not save notification preferences.":"Notification preferences saved.");
 }
 const group=(title:string,description:string,items:readonly (readonly [keyof Preferences,string,string])[])=> <div className="notification-group"><div className="settings-section-intro"><h3>{title}</h3><p>{description}</p></div><div className="notification-list">{items.map(([key,label,description])=><label className="notification-row" key={key}><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={values[key]} onChange={()=>toggle(key)}/><i aria-hidden="true"/></label>)}</div></div>;
 return <form className="notification-form" onSubmit={save}><div className="notification-channel-note"><strong>In-app notifications are active.</strong><span>Your ProjectHub notification inbox is the current delivery channel. Email and push delivery are not active yet; these preferences are retained for future support.</span></div>{group("Email notifications — coming later","These preferences are saved for future email delivery; they do not change your current in-app notifications.",emailItems)}{group("Push notifications — coming later","These preferences are saved for future push delivery; they do not change your current in-app notifications.",pushItems)}<div className="settings-form-actions"><button className="button-primary" disabled={busy}>{busy?"Saving…":"Save notification settings"}</button>{message&&<p className="form-note" role="status">{message}</p>}</div></form>;
}
