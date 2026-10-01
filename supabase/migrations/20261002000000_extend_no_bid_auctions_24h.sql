create or replace function public.settle_auction(p_auction_id uuid)
returns table(auction_id uuid,winner_id uuid,winning_bid numeric,winning_project_id uuid,homepage_slot smallint,ends_at timestamptz)
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  a public.auctions%rowtype;
  b public.auction_bids%rowtype;
  next_ends_at timestamptz;
begin
  if coalesce(auth.role(),'')<>'service_role' and not private.is_admin() then
    raise exception 'Admin authorization required';
  end if;

  select * into a from public.auctions where id=p_auction_id for update;
  if not found then raise exception 'Auction not found'; end if;

  if a.status='active' and now()>=a.ends_at then
    select * into b from public.auction_bids where auction_id=a.id order by amount desc,created_at asc limit 1;

    if not found then
      next_ends_at := now() + interval '24 hours';
      update public.auctions
      set ends_at=next_ends_at,status='active',updated_at=now()
      where id=a.id;

      return query select a.id,null::uuid,null::numeric,null::uuid,a.homepage_slot,next_ends_at;
      return;
    end if;

    update public.auctions
    set status='settled',winner_id=b.bidder_id,winning_bid=b.amount,
        winning_project_id=b.project_id,project_id=b.project_id,updated_at=now()
    where id=a.id;

    return query select a.id,b.bidder_id,b.amount,b.project_id,a.homepage_slot,a.ends_at;
  elsif a.status='settled' then
    return query select a.id,a.winner_id,a.winning_bid,a.winning_project_id,a.homepage_slot,a.ends_at;
  elsif a.status='ended' then
    return query select a.id,null::uuid,null::numeric,null::uuid,a.homepage_slot,a.ends_at;
  else
    raise exception 'Auction cannot be settled in its current state';
  end if;
end;
$function$;
