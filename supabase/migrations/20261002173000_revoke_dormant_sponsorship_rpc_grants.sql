-- Sponsorship features are not part of the current ProjectHub product surface.
-- Keep the legacy tables/functions dormant, but do not expose their RPC endpoints.
revoke execute on function public.get_active_sponsorship(text) from public, anon, authenticated;
revoke execute on function public.record_sponsorship_click(uuid, text) from public, anon, authenticated;
revoke execute on function public.record_sponsorship_impression(uuid) from public, anon, authenticated;
