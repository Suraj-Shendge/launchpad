-- These RPCs have no references in the current ProjectHub application.
-- Keep the functions for compatibility, but remove Data API execution grants.
revoke execute on function public.admin_close_homepage_auction_now(uuid, integer) from public, anon, authenticated;
revoke execute on function public.admin_extend_homepage_auction(uuid, integer) from public, anon, authenticated;
revoke execute on function public.admin_start_homepage_auction(uuid, integer) from public, anon, authenticated;
revoke execute on function public.close_homepage_auction(uuid, integer) from public, anon, authenticated;
revoke execute on function public.get_user_collections(uuid) from public, anon, authenticated;
