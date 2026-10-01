"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CommunityReplyForm({ threadId, locked }: { threadId: string; locked: boolean }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (locked) return <div className="community-locked">This discussion is locked.</div>;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/community/threads/" + threadId + "/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(response.status === 401 ? "Log in to reply." : payload.error || "Could not post reply.");
        return;
      }
      setContent("");
      router.refresh();
    } catch {
      setError("Could not post reply. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="community-reply-form" onSubmit={submit}>
      <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} maxLength={10000} placeholder="Add something useful to the conversation..." />
      {error && <p className="form-error">{error}</p>}
      <div className="community-form-actions">
        <span className="community-helper">Be specific, constructive, and useful to other makers.</span>
        <button type="submit" className="button-primary" disabled={busy || !content.trim()}>{busy ? "Posting..." : "Post reply"}</button>
      </div>
    </form>
  );
}
