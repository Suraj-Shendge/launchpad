-- Keep the auction cycle consistent with the database function:
-- expired active auctions with no bids are extended for a fresh 24-hour window.
create or replace function public.sync_homepage_auction_cycle()
returns integer
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  slot_no integer;
  promo public.promotions%rowtype;
  open_a public.auctions%rowtype;
  latest_settled public.auctions%rowtype;
  pending_payment public.payments%rowtype;
  start_at timestamptz;
  duration_hours integer:=24;
  created_count integer:=0;
begin
  if coalesce(auth.role(),'')<>'service_role' and not private.is_admin() then
    raise exception 'Admin authorization required';
  end if;

  perform pg_advisory_xact_lock(hashtext('projecthub_homepage_auction_cycle'));

  select greatest(1,coalesce(
    (select nullif(value #>> '{}','')::integer
     from public.settings
     where key='homepage_auction_duration_hours'),24))
  into duration_hours;

  update public.promotions
  set status='expired',updated_at=now()
  where status='active' and ends_at is not null and ends_at<=now();

  update public.homepage_slots hs
  set active_promotion_id=null
  where active_promotion_id is not null
    and not exists(
      select 1
      from public.promotions p
      where p.id=hs.active_promotion_id
        and p.status='active'
        and p.starts_at<=now()
        and p.ends_at>now()
    );

  -- A no-bid auction does not end permanently. It gets another full 24-hour window.
  update public.auctions a
  set ends_at=now()+interval '24 hours',
      status='active',
      updated_at=now()
  where a.status='active'
    and a.ends_at<=now()
    and not exists(
      select 1 from public.auction_bids b where b.auction_id=a.id
    );

  update public.auctions a
  set status='ended',updated_at=now()
  where a.status='scheduled'
    and a.starts_at<=now()
    and a.ends_at<=now();

  for slot_no in 1..10 loop
    promo:=null;
    open_a:=null;
    latest_settled:=null;
    pending_payment:=null;

    select * into promo
    from public.promotions p
    where p.homepage_slot=slot_no
      and p.status='active'
      and p.position_id in(
        select id from public.promotion_positions
        where slug in('homepage-hero','homepage-featured')
      )
      and p.starts_at<=now()
      and p.ends_at>now()
    order by p.ends_at desc
    limit 1;

    select * into open_a
    from public.auctions a
    where a.homepage_slot=slot_no
      and a.status in('scheduled','active')
      and a.ends_at>now()
    order by a.starts_at
    limit 1;

    if promo.id is not null then
      if open_a.id is null then
        start_at=promo.ends_at-(duration_hours*interval '1 hour');

        insert into public.auctions(
          project_id,position_id,homepage_slot,starting_price,current_bid,
          bid_increment,starts_at,ends_at,status
        )
        values(
          null,promo.position_id,slot_no,
          coalesce(
            (select nullif(value #>> '{}','')::numeric
             from public.settings where key='auction_starting_price'),1499),
          null,
          coalesce(
            (select nullif(value #>> '{}','')::numeric
             from public.settings where key='auction_min_bid_increment'),100),
          start_at,promo.ends_at,
          case when start_at<=now() then 'active' else 'scheduled' end
        );

        created_count:=created_count+1;

      elsif open_a.status='scheduled' and open_a.starts_at<=now() then
        update public.auctions
        set status='active',updated_at=now()
        where id=open_a.id and status='scheduled';
      end if;

    else
      select * into latest_settled
      from public.auctions
      where homepage_slot=slot_no
        and status='settled'
      order by ends_at desc
      limit 1;

      if latest_settled.id is not null then
        select * into pending_payment
        from public.payments
        where auction_id=latest_settled.id
          and status='pending'
        limit 1;
      end if;

      if open_a.id is null and pending_payment.id is null then
        insert into public.auctions(
          project_id,position_id,homepage_slot,starting_price,current_bid,
          bid_increment,starts_at,ends_at,status
        )
        values(
          null,
          (select id from public.promotion_positions
           where slug='homepage-featured' limit 1),
          slot_no,
          coalesce(
            (select nullif(value #>> '{}','')::numeric
             from public.settings where key='auction_starting_price'),1499),
          null,
          coalesce(
            (select nullif(value #>> '{}','')::numeric
             from public.settings where key='auction_min_bid_increment'),100),
          now(),now()+(duration_hours*interval '1 hour'),'active'
        );

        created_count:=created_count+1;
      end if;
    end if;
  end loop;

  return created_count;
end;
$function$;
