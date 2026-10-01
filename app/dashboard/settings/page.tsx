import { redirect } from "next/navigation";
import { Bell, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/projecthub/navbar";
import { Footer } from "@/components/projecthub/footer";
import { AccountSecurityForm } from "@/components/projecthub/account-security-form";
import { NotificationSettingsForm } from "@/components/projecthub/notification-settings-form";
import { NewsletterAccountPreference } from "@/components/projecthub/newsletter-account-preference";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

const defaults={
 email_new_follower:true,email_new_comment:true,email_new_vote:true,email_new_review:true,email_weekly_digest:true,
 push_new_follower:true,push_new_comment:true,push_new_vote:true,push_new_review:true,push_weekly_digest:true,
};

export default async function Settings(){
 if(!hasEnvVars)redirect("/login");
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect("/login?next=/dashboard/settings");
 const {data:preferences}=await supabase.from("notification_preferences").select("*").eq("user_id",user.id).maybeSingle();
 const {data:newsletterSubscription}=await supabase.from("newsletter_subscribers").select("status").eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
 const prefs={...defaults,...(preferences??{})};
 return <div><Navbar authenticated/><main className="section account-settings-page">
  <div className="settings-page-head"><div><p className="eyebrow">Account</p><h1 className="section-title">Settings.</h1><p className="section-copy">Manage your sign-in details, security and notification preferences. Your public profile has its own dedicated page.</p></div></div>
  <section className="settings-card"><div className="settings-card-head"><span className="settings-card-icon"><ShieldCheck size={18}/></span><div><p className="eyebrow">Security</p><h2>Sign-in & security</h2><p>Keep your account details and password up to date.</p></div></div><AccountSecurityForm email={user.email??""}/></section>
  <section className="settings-card"><div className="settings-card-head"><span className="settings-card-icon"><Bell size={18}/></span><div><p className="eyebrow">Notifications</p><h2>Notification preferences</h2><p>In-app notifications are active. Email and push delivery are not active yet; those preferences are reserved for future delivery.</p></div></div><NotificationSettingsForm initial={prefs}/></section>
  <section className="settings-card"><div className="settings-card-head"><span className="settings-card-icon"><Mail size={18}/></span><div><p className="eyebrow">Newsletter</p><h2>ProjectHub Newsletter</h2><p>Email updates are separate from your normal notification preferences.</p></div></div><NewsletterAccountPreference initialStatus={newsletterSubscription?.status??null}/></section>
  <section className="settings-card settings-account-card"><div className="settings-card-head"><span className="settings-card-icon"><KeyRound size={18}/></span><div><p className="eyebrow">Account</p><h2>Account access</h2><p>You are signed in as <strong>{user.email}</strong>. Use the account menu to sign out.</p></div></div><div className="settings-access-note"><span>Need to update your public identity?</span><a href="/profile">Open your profile →</a></div></section>
 </main><Footer/></div>;
}
