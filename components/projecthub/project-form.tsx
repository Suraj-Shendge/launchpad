"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/types";

export function ProjectForm({categories}:{categories:Category[]}) {
  const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const router=useRouter();
  async function submit(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form=new FormData(event.currentTarget);
    const response=await fetch("/api/projects",{method:"POST",body:form});
    const payload=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok){setError(payload.error||"Could not submit project.");return}
    router.push("/dashboard/projects?submitted=1"); router.refresh();
  }
  return <form onSubmit={submit} className="project-form">
    <div className="form-grid"><label>Project name<input name="name" maxLength={80} required placeholder="Your project"/></label><label>Website URL<input name="website_url" type="url" required placeholder="https://"/></label></div>
    <label>Tagline<input name="tagline" maxLength={120} required placeholder="One clear sentence about what it does"/></label>
    <label>Description<textarea name="description" rows={7} maxLength={4000} required placeholder="Explain the product, who it is for, and what makes it useful."/></label>
    <div className="form-grid"><label>Category<select name="category_id" required><option value="">Choose a category</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Tags<input name="tags" placeholder="ai, saas, productivity"/></label></div>
    <div className="form-grid"><label>Logo<input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"/></label><label>Social links<input name="social_links" placeholder="x=https://x.com/… , linkedin=https://…"/></label></div>
    {error&&<p className="form-error" role="alert">{error}</p>}
    <button className="button-primary" disabled={busy}>{busy?"Submitting…":"Submit for review"}</button>
    <p className="form-note">Projects enter review before becoming publicly visible.</p>
  </form>;
}
