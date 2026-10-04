-- Auction winner payment expiry is a valid terminal state.
alter table public.payments
  drop constraint if exists payments_projecthub_status_check;

alter table public.payments
  add constraint payments_projecthub_status_check
  check (status = any (array[
    'created'::text,
    'pending'::text,
    'paid'::text,
    'failed'::text,
    'expired'::text,
    'refunded'::text,
    'cancelled'::text
  ]));
