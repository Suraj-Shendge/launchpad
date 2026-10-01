export type NewsletterBlockType = "hero" | "text" | "projects" | "community" | "cta";
export type NewsletterProjectItem = { projectId:string; title:string; tagline:string; excerpt:string; imageUrl?:string|null; href:string };
export type NewsletterCommunityItem = { threadId:string; title:string; excerpt:string; href:string; };
export type NewsletterBlock =
  | { id:string; type:"hero"; eyebrow:string; title:string; body:string; imageUrl?:string|null; ctaLabel?:string; ctaUrl?:string }
  | { id:string; type:"text"; eyebrow:string; title:string; body:string }
  | { id:string; type:"projects"; heading:string; items:NewsletterProjectItem[] }
  | { id:string; type:"community"; heading:string; items:NewsletterCommunityItem[] }
  | { id:string; type:"cta"; title:string; body:string; label:string; url:string };
export type NewsletterContent = { version:1; blocks:NewsletterBlock[] };
export type NewsletterEditionType = "digest" | "announcement";
export type NewsletterEditionStatus = "draft" | "scheduled" | "sent";
