-- ProjectHub security hardening: preserve existing public reads while closing
-- internal mutation/notification functions to their intended callers.

alter table public.promotion_types enable row level security;
alter table public.promotion_positions enable row level security;
alter table public.settings enable row level security;

drop policy if exists projecthub_promotion_types_public_read on public.promotion_types;
create policy projecthub_promotion_types_public_read
on public.promotion_types for select to anon, authenticated
using (true);

drop policy if exists projecthub_promotion_positions_public_read on public.promotion_positions;
create policy projecthub_promotion_positions_public_read
on public.promotion_positions for select to anon, authenticated
using (true);

drop policy if exists projecthub_settings_public_read on public.settings;
create policy projecthub_settings_public_read
on public.settings for select to anon, authenticated
using (is_public or private.is_admin());
-- These functions are invoked by database triggers, not directly by clients.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_new_user_notifications() from public, anon, authenticated;
revoke all on function public.notify_community_post_created() from public, anon, authenticated;
revoke all on function public.notify_community_thread_created() from public, anon, authenticated;
revoke all on function public.notify_new_follower() from public, anon, authenticated;
revoke all on function public.notify_project_published() from public, anon, authenticated;
revoke all on function public.notify_project_upvote() from public, anon, authenticated;

-- Client mutations require a signed-in ProjectHub user.
revoke execute on function public.add_community_post(uuid, text, uuid) from anon;
revoke execute on function public.toggle_follow(text, uuid) from anon;
revoke execute on function public.toggle_project_vote(uuid) from anon;
revoke execute on function public.is_current_user_admin() from anon;
-- Remove exact duplicate indexes while retaining the indexes backing
-- UNIQUE constraints.
drop index if exists public.community_posts_thread_idx;
drop index if exists public.community_thread_votes_thread_user_key;
drop index if exists public.follows_user_lookup;
drop index if exists public.follows_unique_follower_target;
