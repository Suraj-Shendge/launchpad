-- Personalized ProjectHub RPCs must not be callable through PUBLIC/anon.
-- Keep authenticated and server-side access explicit.

revoke all on function public.get_user_review_vote(uuid) from public, anon, authenticated;
grant execute on function public.get_user_review_vote(uuid) to authenticated, service_role;

revoke all on function public.has_liked_comment(uuid) from public, anon, authenticated;
grant execute on function public.has_liked_comment(uuid) to authenticated, service_role;

revoke all on function public.is_following(text, uuid) from public, anon, authenticated;
grant execute on function public.is_following(text, uuid) to authenticated, service_role;

revoke all on function public.get_project_comments_with_likes(uuid, uuid, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_project_comments_with_likes(uuid, uuid, text, text, integer, integer) to authenticated, service_role;

revoke all on function public.get_project_reviews(uuid, uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_project_reviews(uuid, uuid, text, integer, integer) to authenticated, service_role;

revoke all on function public.toggle_comment_like(uuid) from public, anon, authenticated;
grant execute on function public.toggle_comment_like(uuid) to authenticated, service_role;

revoke all on function public.toggle_review_vote(uuid, text) from public, anon, authenticated;
grant execute on function public.toggle_review_vote(uuid, text) to authenticated, service_role;

revoke all on function public.update_my_profile(text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.update_my_profile(text, text, text, text, text, text, text, text) to authenticated, service_role;
