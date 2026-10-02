alter table public.payments
  add column if not exists payment_deadline_at timestamptz,
  add column if not exists auction_payment_round integer not null default 1,
  add column if not exists fallback_notified_at timestamptz;

drop index if exists public.payments_active_auction_uidx;

create index if not exists payments_auction_deadline_idx
  on public.payments(auction_id,status,payment_deadline_at)
  where auction_id is not null;

update public.payments
set payment_deadline_at=created_at + interval '15 minutes',
    auction_payment_round=coalesce(auction_payment_round,1)
where auction_id is not null
  and status='pending'
  and payment_deadline_at is null;
