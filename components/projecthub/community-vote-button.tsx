"use client";

import { useState } from "react";
import { ArrowBigUp, Loader2 } from "lucide-react";

export function CommunityVoteButton({ threadId, initialCount, initialVoted = false }: {
  threadId: string;
  initialCount: number;
  initialVoted?: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initialVoted);
  const [busy, setBusy] = useState(false);

  async function toggleVote() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/community/threads/" + threadId + "/vote", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 401) window.location.href = "/login?next=" + encodeURIComponent(window.location.pathname);
        return;
      }
      setCount(payload.vote_count);
      setVoted(payload.voted);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className={"community-vote " + (voted ? "is-voted" : "")}
      onClick={toggleVote} aria-label={voted ? "Remove upvote" : "Upvote this discussion"} aria-pressed={voted} disabled={busy}>
      {busy ? <Loader2 size={15} className="spin" /> : <ArrowBigUp size={16} fill={voted ? "currentColor" : "none"} />}
      <span>{count}</span>
    </button>
  );
}
