"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CommunityNewThreadForm({ forums }: { forums: Array<{ id: string; slug: string; name: string }> }) {
  const router = useRouter();
  const [forumId, setForumId] = useState(forums[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/community/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forum_id: forumId, title, content }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(response.status === 401 ? "Please log in to start a discussion." : payload.error || "Something went wrong.");
        return;
      }
      router.push("/community/t/" + payload.id);
      router.refresh();
    } catch {
      setError("Could not create the discussion. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="community-form" onSubmit={submit}>
      <label>Forum<select value={forumId} onChange={(event) => setForumId(event.target.value)} required>
        {forums.map((forum) => <option key={forum.id} value={forum.id}>{forum.name}</option>)}
      </select></label>
      <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} placeholder="What do you want to discuss?" required /></label>
      <label>Post<textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={10000} rows={9} placeholder="Give the community enough context to respond." required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="community-form-actions">
        <button type="button" className="button-outline" onClick={() => router.back()}>Cancel</button>
        <button type="submit" className="button-primary" disabled={busy}>{busy ? "Publishing..." : "Publish discussion"}</button>
      </div>
    </form>
  );
}
