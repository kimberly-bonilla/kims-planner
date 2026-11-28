-- Slice 2: events (EVT-1 to EVT-4) and the user's default currency.

-- ---------------------------------------------------------------------------
-- Currency: CAD or USD. Labels only, never converted.
-- ---------------------------------------------------------------------------
create type public.currency_code as enum ('cad', 'usd');

alter table public.profiles
  add column default_currency public.currency_code not null default 'usd';

-- Users may now edit their default currency too (is_admin stays locked).
grant update (display_name, default_currency) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create type public.event_type as enum (
  'wedding',
  'engagement_party',
  'bridal_shower',
  'baby_shower',
  'graduation_party',
  'birthday_party',
  'anniversary',
  'corporate_event',
  'other'
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  type public.event_type not null,
  -- Required for "Other", and only for "Other" (EVT-3).
  custom_type text check (custom_type is null or char_length(custom_type) between 1 and 60),
  event_date date not null check (event_date between date '2000-01-01' and date '2100-12-31'),
  city text check (city is null or char_length(city) between 1 and 100),
  venue text check (venue is null or char_length(venue) between 1 and 150),
  currency public.currency_code not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_custom_type_matches_type check (
    (type = 'other' and custom_type is not null) or (type <> 'other' and custom_type is null)
  )
);

comment on table public.events is 'A user''s event. Free plan: 1 per user (see max_events_for).';

create index events_owner_id_created_at_idx on public.events (owner_id, created_at);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- Row Level Security: owners only.
alter table public.events enable row level security;

create policy "Owners can read their events"
  on public.events for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Owners can create events for themselves"
  on public.events for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Owners can update their events"
  on public.events for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- No delete policy yet: deleting events/accounts arrives with account deletion (Slice 26).

-- Column privileges: owner_id, id and timestamps are never set by the client.
revoke all on public.events from anon, authenticated;
grant select on public.events to authenticated;
grant insert (name, type, custom_type, event_date, city, venue, currency) on public.events to authenticated;
grant update (name, type, custom_type, event_date, city, venue, currency) on public.events to authenticated;

-- ---------------------------------------------------------------------------
-- Event limit (EVT-1). Enforced in the database so no client can bypass it.
-- Slice 13 changes max_events_for() to return "unlimited" for Premium users.
-- ---------------------------------------------------------------------------
create or replace function public.max_events_for(user_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select 1;
$$;

-- Internal helper: clients must not probe other users' limits through the API.
revoke execute on function public.max_events_for(uuid) from public, anon, authenticated;

create or replace function public.enforce_event_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing integer;
begin
  -- Serialise inserts per owner so two simultaneous requests can't both pass.
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));

  select count(*) into existing from public.events where owner_id = new.owner_id;

  if existing >= public.max_events_for(new.owner_id) then
    raise exception 'event_limit_reached'
      using errcode = 'P0001', hint = 'The free plan includes 1 event. Upgrade to Premium for unlimited events.';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_event_limit() from public, anon, authenticated;

create trigger events_enforce_limit
  before insert on public.events
  for each row execute function public.enforce_event_limit();
