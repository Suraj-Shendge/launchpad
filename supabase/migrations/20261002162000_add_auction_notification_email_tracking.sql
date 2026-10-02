alter table public.notifications add column if not exists email_sent_at timestamptz;

create index if not exists notifications_email_pending_idx
on public.notifications(type, email_sent_at, created_at)
where type in ('auction_outbid','auction_ending_soon') and email_sent_at is null;

