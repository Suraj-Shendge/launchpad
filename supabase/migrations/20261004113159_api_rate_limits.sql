create table if not exists public.api_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public, anon, authenticated;

create index if not exists api_rate_limits_updated_at_idx
  on public.api_rate_limits(updated_at);

create or replace function public.consume_api_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  current_count integer;
  now_at timestamptz := now();
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_RATE_LIMIT_KEY';
  end if;
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'INVALID_RATE_LIMIT_POLICY';
  end if;

  insert into public.api_rate_limits(key_hash,window_started_at,request_count,updated_at)
  values(p_key_hash,now_at,1,now_at)
  on conflict(key_hash) do update
    set request_count=case
      when extract(epoch from (now_at-public.api_rate_limits.window_started_at)) >= p_window_seconds
        then 1
      else least(public.api_rate_limits.request_count+1,p_limit+1)
    end,
    window_started_at=case
      when extract(epoch from (now_at-public.api_rate_limits.window_started_at)) >= p_window_seconds
        then now_at
      else public.api_rate_limits.window_started_at
    end,
    updated_at=now_at;

  select request_count
  into current_count
  from public.api_rate_limits
  where key_hash=p_key_hash;

  return current_count <= p_limit;
end;
$$;

revoke all on function public.consume_api_rate_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text,integer,integer) to service_role;
