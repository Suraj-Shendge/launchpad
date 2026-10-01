-- Site visitor records are service-role-only analytics data.
alter table public.site_visitors enable row level security;
revoke all on public.site_visitors from public, anon, authenticated;
