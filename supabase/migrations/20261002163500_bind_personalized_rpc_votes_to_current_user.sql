-- Preserve RPC signatures, but never trust caller-supplied user ids.
-- Personalized vote fields are always resolved from auth.uid().

create or replace function public.get_project_comments_with_likes(
  p_project_id uuid, p_user_id uuid, p_sort text, p_category text, p_limit integer, p_offset integer
)
returns table(
  id uuid, project_id uuid, user_id uuid, parent_id uuid, content text,
  created_at timestamptz, updated_at timestamptz, deleted_at timestamptz, deleted_by uuid,
  profile_id uuid, profile_name text, profile_display_name text, profile_username text,
  profile_avatar_url text, like_count integer, user_vote text
)
language plpgsql security definer set search_path='public'
as $function$
declare
  v_sort text := coalesce(nullif(lower(p_sort),''),'newest');
  v_category text := coalesce(nullif(lower(p_category),''),'all');
begin
  if v_category='all' then v_category:=null; end if;
  return query
  select pc.id,pc.project_id,pc.user_id,pc.parent_id,pc.content,pc.created_at,pc.updated_at,pc.deleted_at,pc.deleted_by,
         p.id,p.name,p.display_name,p.username,p.avatar_url,coalesce(pc.like_count,0),
         case when pcl.user_id is not null then 'like' else null end
  from public.project_comments pc
  left join public.profiles p on p.id=pc.user_id
  left join public.comment_likes pcl on pcl.comment_id=pc.id and pcl.user_id=(select auth.uid())
  where pc.project_id=p_project_id and pc.deleted_at is null
    and (v_category is null or pc.category=v_category)
  order by case when v_sort='oldest' then pc.created_at end asc,
           case when v_sort='newest' then pc.created_at end desc,
           case when v_sort='top' then coalesce(pc.like_count,0) end desc,
           pc.created_at desc
  limit greatest(1,least(p_limit,100)) offset p_offset;
end;
$function$;

create or replace function public.get_project_reviews(
  p_project_id uuid, p_user_id uuid, p_sort text, p_limit integer, p_offset integer
)
returns table(
  id uuid, project_id uuid, user_id uuid, rating integer, quality_rating integer,
  ease_of_use_rating integer, value_rating integer, support_rating integer, title text, content text,
  verified_purchase boolean, usage_duration text, status text, moderation_reason text,
  helpful_count integer, unhelpful_count integer, created_at timestamptz, updated_at timestamptz,
  profile_id uuid, profile_name text, profile_display_name text, profile_username text,
  profile_avatar_url text, user_vote text
)
language plpgsql security definer set search_path='public'
as $function$
declare v_sort text := coalesce(nullif(lower(p_sort),''),'newest');
begin
  if v_sort not in ('newest','oldest','highest','lowest','most_helpful') then v_sort:='newest'; end if;
  return query
  select pr.id,pr.project_id,pr.user_id,pr.rating,pr.quality_rating,pr.ease_of_use_rating,pr.value_rating,
         pr.support_rating,pr.title,pr.content,pr.verified_purchase,pr.usage_duration,pr.status,pr.moderation_reason,
         pr.helpful_count,pr.unhelpful_count,pr.created_at,pr.updated_at,
         p.id,p.name,p.display_name,p.username,p.avatar_url,rv.vote_type
  from public.product_reviews pr
  left join public.profiles p on p.id=pr.user_id
  left join public.review_votes rv on rv.review_id=pr.id and rv.user_id=(select auth.uid())
  where pr.project_id=p_project_id and pr.status='published'
  order by case when v_sort='newest' then pr.created_at end desc,
           case when v_sort='oldest' then pr.created_at end asc,
           case when v_sort='highest' then pr.rating end desc,
           case when v_sort='lowest' then pr.rating end asc,
           case when v_sort='most_helpful' then pr.helpful_count end desc,
           pr.created_at desc
  limit greatest(1,least(p_limit,50)) offset p_offset;
end;
$function$;

-- Keep these signatures callable only by authenticated users.
revoke all on function public.get_project_comments_with_likes(uuid,uuid,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.get_project_comments_with_likes(uuid,uuid,text,text,integer,integer) to authenticated,service_role;

revoke all on function public.get_project_reviews(uuid,uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.get_project_reviews(uuid,uuid,text,integer,integer) to authenticated,service_role;
