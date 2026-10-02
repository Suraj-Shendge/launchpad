create unique index if not exists promotions_active_homepage_placement_uidx
on public.promotions(project_id,user_id,position_id,homepage_slot)
where status in ('active','scheduled') and homepage_slot is not null;
