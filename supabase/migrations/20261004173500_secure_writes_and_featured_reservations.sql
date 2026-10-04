-- Tighten Data API write privileges and make Explore Featured reservations atomic.

-- Internal/admin state is server-managed.
revoke insert, update, delete on public.admin_access from public, anon, authenticated;
revoke insert, update, delete on public.admin_audit_logs from public, anon, authenticated;

-- Notifications are created only by server-side code/triggers.
revoke insert, update, delete on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;

-- Payments are created and mutated only by server-side payment code.
revoke insert, update, delete on public.payments from public, anon, authenticated;
grant select on public.payments to authenticated;

-- Comments: users can create/edit/delete their own comments, but cannot write
-- moderation, attribution, counters, or deletion metadata.
revoke insert, update, delete on public.project_comments from public, anon, authenticated;
grant insert (project_id, user_id, parent_id, content) on public.project_comments to authenticated;
grant update (content, updated_at) on public.project_comments to authenticated;
grant delete on public.project_comments to authenticated;

-- Community threads are created by the authenticated API route. No direct
-- client-side update/delete privileges are needed by the current UI.
revoke insert, update, delete on public.community_threads from public, anon, authenticated;
grant insert (forum_id, user_id, title, content, slug) on public.community_threads to authenticated;

create or replace function public.reserve_featured_promotion_for_payment(
  p_project_id uuid,
  p_user_id uuid,
  p_amount integer,
  p_duration_days integer,
  p_reservation_minutes integer default 15
)
returns table(
  promotion_id uuid,
  reservation_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type_id uuid;
  v_position_id uuid;
  v_promotion_id uuid;
  v_expires timestamptz;
begin
  if p_project_id is null or p_user_id is null then
    raise exception 'INVALID_PROMOTION_REQUEST';
  end if;
  if p_amount <= 0 or p_duration_days <= 0 or p_reservation_minutes <= 0 then
    raise exception 'INVALID_PROMOTION_REQUEST';
  end if;

  perform pg_advisory_xact_lock(hashtext('projecthub_explore_featured_slots'));

  select id into v_type_id
  from public.promotion_types
  where slug = 'featured'
  limit 1;

  select id into v_position_id
  from public.promotion_positions
  where slug = 'explore-featured'
  limit 1;

  if v_type_id is null or v_position_id is null then
    raise exception 'FEATURED_CONFIGURATION_MISSING';
  end if;

  update public.promotions
  set status = 'expired',
      reservation_expires_at = null,
      updated_at = now()
  where type = 'featured'
    and position_id = v_position_id
    and status = 'pending'
    and reservation_expires_at is not null
    and reservation_expires_at <= now();

  if not exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and p.owner_id = p_user_id
      and p.status = 'published'
      and p.deleted_at is null
  ) then
    raise exception 'PROJECT_NOT_ELIGIBLE';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and coalesce(p.can_promote, true) = true
      and coalesce(p.is_blocked, false) = false
  ) then
    raise exception 'PROMOTION_NOT_ALLOWED';
  end if;

  if exists (
    select 1
    from public.promotions pr
    where pr.project_id = p_project_id
      and pr.position_id = v_position_id
      and (
        (pr.status in ('active','scheduled') and coalesce(pr.ends_at, 'infinity'::timestamptz) > now())
        or (pr.status = 'pending' and coalesce(pr.reservation_expires_at, 'epoch'::timestamptz) > now())
      )
  ) then
    raise exception 'PROJECT_ALREADY_PROMOTED';
  end if;

  if (
    select count(*)
    from public.promotions pr
    where pr.position_id = v_position_id
      and (
        (pr.status in ('active','scheduled') and coalesce(pr.ends_at, 'infinity'::timestamptz) > now())
        or (pr.status = 'pending' and coalesce(pr.reservation_expires_at, 'epoch'::timestamptz) > now())
      )
  ) >= 5 then
    raise exception 'FEATURED_FULL';
  end if;

  v_expires := now() + make_interval(mins => p_reservation_minutes);

  insert into public.promotions(
    project_id,
    user_id,
    type,
    type_id,
    position_id,
    amount,
    duration_days,
    status,
    reservation_expires_at
  )
  values(
    p_project_id,
    p_user_id,
    'featured',
    v_type_id,
    v_position_id,
    p_amount,
    p_duration_days,
    'pending',
    v_expires
  )
  returning id into v_promotion_id;

  return query
  select v_promotion_id, v_expires;
end;
$$;

revoke all on function public.reserve_featured_promotion_for_payment(uuid, uuid, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_featured_promotion_for_payment(uuid, uuid, integer, integer, integer) to service_role;
