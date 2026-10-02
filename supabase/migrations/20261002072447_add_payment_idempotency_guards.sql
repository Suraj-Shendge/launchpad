alter table public.payments
  add column if not exists idempotency_key text;

create unique index if not exists payments_user_idempotency_key_uidx
  on public.payments(user_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists payments_active_auction_uidx
  on public.payments(auction_id)
  where auction_id is not null and status <> 'failed';

create index if not exists payment_events_payment_id_idx
  on public.payment_events(payment_id);
