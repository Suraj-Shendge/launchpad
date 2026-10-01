-- Community thread voting is an authenticated mutation.
revoke all on function public.toggle_community_thread_vote(uuid) from public, anon;
grant execute on function public.toggle_community_thread_vote(uuid) to authenticated;
