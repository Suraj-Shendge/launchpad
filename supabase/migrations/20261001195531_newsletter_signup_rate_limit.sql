create table if not exists public.newsletter_signup_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null,
  attempts integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.newsletter_signup_rate_limits enable row level security;

create or replace function public.consume_newsletter_signup_rate_limit(p_key_hash text,p_limit integer default 5,p_window_seconds integer default 600)
returns boolean language plpgsql security definer set search_path=public as $$
declare current_started timestamptz; current_attempts integer;
begin
  insert into public.newsletter_signup_rate_limits(key_hash,window_started_at,attempts,updated_at)
  values(p_key_hash,now(),1,now())
  on conflict(key_hash) do update
    set attempts=case when extract(epoch from (now()-newsletter_signup_rate_limits.window_started_at)) >= p_window_seconds then 1 else newsletter_signup_rate_limits.attempts+1 end,
        window_started_at=case when extract(epoch from (now()-newsletter_signup_rate_limits.window_started_at)) >= p_window_seconds then now() else newsletter_signup_rate_limits.window_started_at end,
        updated_at=now();
  select window_started_at,attempts into current_started,current_attempts from public.newsletter_signup_rate_limits where key_hash=p_key_hash;
  return current_attempts <= p_limit;
end;
$$;

revoke execute on function public.consume_newsletter_signup_rate_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_newsletter_signup_rate_limit(text,integer,integer) to service_role;
