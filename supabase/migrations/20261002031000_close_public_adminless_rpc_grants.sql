-- Remove inherited PUBLIC EXECUTE from authenticated-only RPCs.
revoke all on function public.add_community_post(uuid, text, uuid) from public, anon;
grant execute on function public.add_community_post(uuid, text, uuid) to authenticated;

revoke all on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_admin() to authenticated;
