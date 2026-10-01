create table if not exists public.newsletter_settings (
  id text primary key default 'default',
  resend_segment_id text unique,
  resend_unsubscribe_property_key text,
  from_email text not null default 'ProjectHub <newsletter@projecthub.app>',
  reply_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  normalized_email text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','subscribed','unsubscribed')),
  confirmation_token_hash text,
  confirmation_expires_at timestamptz,
  confirmation_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  unsubscribe_token_hash text not null unique,
  provider_contact_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_subscribers_user_id_idx on public.newsletter_subscribers(user_id);
create index if not exists newsletter_subscribers_status_idx on public.newsletter_subscribers(status);

create table if not exists public.newsletter_editions (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'digest' check (type in ('digest','announcement')),
  title text not null,
  slug text unique,
  subject text not null,
  preview_text text,
  content jsonb not null default '{"version":1,"blocks":[]}'::jsonb,
  status text not null default 'draft' check (status in ('draft','scheduled','sent')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  provider_broadcast_id text unique,
  provider_status text,
  recipient_count integer not null default 0,
  last_error text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_editions_status_idx on public.newsletter_editions(status, scheduled_at);
create index if not exists newsletter_editions_created_at_idx on public.newsletter_editions(created_at desc);

alter table public.newsletter_settings enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_editions enable row level security;

drop policy if exists newsletter_editions_public_sent on public.newsletter_editions;
create policy newsletter_editions_public_sent
on public.newsletter_editions
for select to anon, authenticated
using (status = 'sent');

create or replace function public.set_newsletter_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists newsletter_settings_updated_at on public.newsletter_settings;
create trigger newsletter_settings_updated_at before update on public.newsletter_settings
for each row execute function public.set_newsletter_updated_at();

drop trigger if exists newsletter_subscribers_updated_at on public.newsletter_subscribers;
create trigger newsletter_subscribers_updated_at before update on public.newsletter_subscribers
for each row execute function public.set_newsletter_updated_at();

drop trigger if exists newsletter_editions_updated_at on public.newsletter_editions;
create trigger newsletter_editions_updated_at before update on public.newsletter_editions
for each row execute function public.set_newsletter_updated_at();

create or replace function public.prevent_sent_newsletter_edits()
returns trigger language plpgsql as $$
begin
  if old.status = 'sent' and (
    new.type is distinct from old.type or new.title is distinct from old.title or
    new.slug is distinct from old.slug or new.subject is distinct from old.subject or
    new.preview_text is distinct from old.preview_text or new.content is distinct from old.content or
    new.status is distinct from old.status or new.scheduled_at is distinct from old.scheduled_at or
    new.sent_at is distinct from old.sent_at or new.provider_broadcast_id is distinct from old.provider_broadcast_id or
    new.recipient_count is distinct from old.recipient_count
  ) then raise exception 'Sent newsletter editions are immutable'; end if;
  return new;
end;
$$;

drop trigger if exists newsletter_editions_immutable on public.newsletter_editions;
create trigger newsletter_editions_immutable before update on public.newsletter_editions
for each row execute function public.prevent_sent_newsletter_edits();

insert into public.newsletter_settings (id) values ('default') on conflict (id) do nothing;
