-- Move pg_net out of public. pg_net 0.20.x keeps its network API in
-- the net schema even when the extension itself is installed in extensions.
drop function if exists public.projecthub_cron_dispatch(text);
drop extension if exists pg_net;
create extension pg_net with schema extensions;

create or replace function public.projecthub_cron_dispatch(p_path text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_url text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret into base_url
  from vault.decrypted_secrets
  where name = 'projecthub_cron_url'
  limit 1;

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'projecthub_cron_secret'
  limit 1;

  base_url := rtrim(coalesce(base_url, ''), '/');
  cron_secret := coalesce(cron_secret, '');

  if base_url = '' or cron_secret = '' or base_url !~ '^https://'
     or p_path not in ('/api/cron/settle-auctions', '/api/cron/newsletter-sync') then
    return null;
  end if;

  select net.http_post(
    url := base_url || p_path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
    ),
    body := jsonb_build_object('source', 'supabase-cron'),
    timeout_milliseconds := 10000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.projecthub_cron_dispatch(text) from public, anon, authenticated;
grant execute on function public.projecthub_cron_dispatch(text) to postgres, service_role;

-- Keep pg_net available to Postgres and Supabase's webhook worker only.
revoke execute on function net.http_get(text, jsonb, jsonb, integer) from public, anon, authenticated, service_role;
revoke execute on function net.http_post(text, jsonb, jsonb, jsonb, integer) from public, anon, authenticated, service_role;
revoke execute on function net.http_delete(text, jsonb, jsonb, integer, jsonb) from public, anon, authenticated, service_role;
revoke execute on function net.http_collect_response(bigint, boolean) from public, anon, authenticated, service_role;
revoke execute on function net.worker_restart() from public, anon, authenticated, service_role;
revoke execute on function net.wait_until_running() from public, anon, authenticated, service_role;
revoke execute on function net.wake() from public, anon, authenticated, service_role;
revoke execute on function net.check_worker_is_up() from public, anon, authenticated, service_role;

grant execute on function net.http_get(text, jsonb, jsonb, integer) to postgres, supabase_functions_admin;
grant execute on function net.http_post(text, jsonb, jsonb, jsonb, integer) to postgres, supabase_functions_admin;
grant execute on function net.http_delete(text, jsonb, jsonb, integer, jsonb) to postgres, supabase_functions_admin;
grant execute on function net.http_collect_response(bigint, boolean) to postgres, supabase_functions_admin;
grant execute on function net.worker_restart() to postgres, supabase_functions_admin;
grant execute on function net.wait_until_running() to postgres, supabase_functions_admin;
grant execute on function net.wake() to postgres, supabase_functions_admin;
grant execute on function net.check_worker_is_up() to postgres, supabase_functions_admin;
