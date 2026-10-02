create or replace function public.notify_auction_outbid()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  project_name text;
begin
  select name into project_name
  from public.projects
  where id = new.project_id;

  insert into public.notifications(
    user_id, type, title, message, link, reference_type, reference_id
  )
  select distinct
    b.bidder_id,
    'auction_outbid',
    'You''ve been outbid',
    'A higher bid of ₹' || to_char(new.amount, 'FM999,999,999,990') ||
      ' was placed' ||
      case when project_name is not null then ' on ' || project_name else ' on this auction' end ||
      '. Your previous bid is no longer winning.',
    '/auctions/' || new.auction_id,
    'auction',
    new.id
  from public.auction_bids b
  where b.auction_id = new.auction_id
    and b.bidder_id <> new.bidder_id
    and b.amount < new.amount;

  return new;
end;
$$;

drop trigger if exists auction_outbid_notification on public.auction_bids;
create trigger auction_outbid_notification
after insert on public.auction_bids
for each row execute function public.notify_auction_outbid();

revoke all on function public.notify_auction_outbid() from public, anon, authenticated;
