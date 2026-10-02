create or replace function public.projecthub_cron_dispatch(p_path text)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
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

select cron.unschedule(jobid)
from cron.job
where jobname in ('projecthub-auction-lifecycle', 'projecthub-newsletter-sync');

select cron.schedule(
  'projecthub-auction-lifecycle',
  '*/5 * * * *',
  $$select public.projecthub_cron_dispatch('/api/cron/settle-auctions');$$
);

select cron.schedule(
  'projecthub-newsletter-sync',
  '*/5 * * * *',
  $$select public.projecthub_cron_dispatch('/api/cron/newsletter-sync');$$
);
