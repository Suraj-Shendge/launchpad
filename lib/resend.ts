import { Resend } from "resend";
export const NEWSLETTER_UNSUBSCRIBE_PROPERTY = "projecthub_unsubscribe_url";

export function getResend(){
  const key=process.env.RESEND_API_KEY;
  if(!key) throw new Error("RESEND_API_KEY is not configured.");
  return new Resend(key);
}

export function getNewsletterFrom(fallback="ProjectHub <onboarding@resend.dev>"){
  return process.env.NEWSLETTER_FROM_EMAIL || fallback;
}

export { getSiteUrl } from "@/lib/site-url";
