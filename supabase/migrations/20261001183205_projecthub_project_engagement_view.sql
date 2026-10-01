create or replace view public.project_directory as
select p.id,p.owner_id as creator_id,p.slug,p.name,coalesce(p.tagline,'') as tagline,p.description,
 p.logo_url,p.preview_images,p.website_url,p.social_links,p.status,p.created_at,p.updated_at,p.published_at,
 c.id as category_id,c.name as category_name,c.slug as category_slug,
 coalesce(pr.display_name,pr.name) as creator_name,
 coalesce(array_agg(distinct t.name) filter(where t.name is not null),'{}'::text[]) as tags,
 (exists(select 1 from public.promotions x join public.promotion_types pt on pt.id=x.type_id
   where x.project_id=p.id and x.status='active' and pt.slug='featured')) as featured,
 (exists(select 1 from public.promotions x join public.promotion_positions pp on pp.id=x.position_id
   where x.project_id=p.id and x.status='active' and pp.slug=any(array['homepage-hero','homepage-featured']))) as promoted,
 (select count(*)::integer from public.project_votes pv where pv.project_id=p.id) as upvote_count
from public.projects p join public.categories c on c.id=p.category_id join public.profiles pr on pr.id=p.owner_id
left join public.project_tags ptg on ptg.project_id=p.id left join public.tags t on t.id=ptg.tag_id
where p.deleted_at is null group by p.id,c.id,pr.id;
