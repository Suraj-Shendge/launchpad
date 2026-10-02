-- Retire RPC entry points from older payment, auction and admin flows.
-- The current application uses authenticated API routes and server-side finalization.
revoke execute on function public.activate_featured_payment(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.activate_homepage_payment(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.reserve_featured_promotion(uuid, uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.place_homepage_bid(uuid, uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.get_admin_overview() from public, anon, authenticated;
revoke execute on function public.is_current_user_admin() from public, anon, authenticated;
