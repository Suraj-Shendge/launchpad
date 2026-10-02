create or replace function public.get_explore_featured_project_ids(p_limit integer default 5)
returns table(project_id uuid)
language sql
security definer
set search_path=public,pg_temp
as $$
  select pr.project_id
  from public.promotions pr
  join public.promotion_positions pp on pp.id=pr.position_id
  join public.project_directory pd on pd.id=pr.project_id
  where pr.type='featured'
    and pp.slug='explore-featured'
    and pr.status='active'
    and pr.starts_at<=now()
    and pr.ends_at>now()
    and pd.status='published'
  order by pr.starts_at asc, pr.created_at asc
  limit least(greatest(coalesce(p_limit,5),1),5);
$$;

revoke all on function public.get_explore_featured_project_ids(integer) from public;
grant execute on function public.get_explore_featured_project_ids(integer) to anon,authenticated;
