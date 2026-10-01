-- Harden views that are already backed by row-level policies.
-- Public auction summary/winner views remain curated SECURITY DEFINER views because
-- their source auction rows intentionally contain private bid/winner columns.

create or replace view public.project_directory
with (security_invoker=true)
as
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
-- Dashboard views only expose a user's own auction activity.
drop policy if exists projecthub_auctions_dashboard_read on public.auctions;
create policy projecthub_auctions_dashboard_read
on public.auctions for select to authenticated
using (
  status in ('scheduled','active')
  or winner_id = auth.uid()
  or exists (select 1 from public.auction_bids b where b.auction_id=auctions.id and b.bidder_id=auth.uid())
  or private.is_admin()
);

create or replace view public.dashboard_auction_bids
with (security_invoker=true)
as
select b.id,b.bidder_id,b.auction_id,b.project_id,b.amount,b.created_at,a.ends_at,a.status
from public.auction_bids b join public.auctions a on a.id=b.auction_id
where b.bidder_id=auth.uid();
create or replace view public.dashboard_auction_wins
with (security_invoker=true)
as
select a.id,a.winning_bid,a.ends_at,a.status,a.winner_id,
       coalesce(wp.name,p.name) as project_name,
       coalesce(wp.slug,p.slug) as project_slug
from public.auctions a
left join public.projects wp on wp.id=a.winning_project_id
left join public.projects p on p.id=a.project_id
where a.winner_id=auth.uid() and a.status='settled';
