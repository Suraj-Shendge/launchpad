alter table public.projects alter column website_url drop not null;

update public.project_verifications
set website_status='not_required',
    website_url=null,
    cross_link_status='not_required',
    website_method=null,
    website_evidence='{}'::jsonb
where website_url is null;
