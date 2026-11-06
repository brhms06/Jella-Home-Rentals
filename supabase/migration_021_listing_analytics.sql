-- Run once in the Supabase SQL editor, after migration_020_profile_photo_country.sql.
-- Landlord analytics: anonymous view/contact events per listing, read back only by the listing's owner.

create table listing_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  device_id text not null,
  event text not null check (event in ('view', 'contact')),
  created_at timestamptz not null default now()
);
create index listing_events_listing_idx on listing_events (listing_id, event, created_at);
alter table listing_events enable row level security;
-- No policies: default-deny. Writes go through log_listing_event(), reads through the owner_* functions.

-- Anonymous write path. Only logs for active listings; a device's repeat 'view' within an hour is ignored.
create or replace function public.log_listing_event(p_listing_id uuid, p_device_id text, p_event text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_event not in ('view', 'contact') or coalesce(p_device_id, '') = '' then
    return;
  end if;
  if not exists (select 1 from listings where id = p_listing_id and status = 'active') then
    return;
  end if;
  if p_event = 'view' and exists (
    select 1 from listing_events
    where listing_id = p_listing_id and device_id = p_device_id and event = 'view'
      and created_at > now() - interval '1 hour'
  ) then
    return;
  end if;
  insert into listing_events (listing_id, device_id, event) values (p_listing_id, p_device_id, p_event);
end;
$$;
grant execute on function public.log_listing_event to anon, authenticated;

-- Per-listing totals for the signed-in landlord's own listings over the last p_days days.
create or replace function public.owner_listing_stats(p_days int default 7)
returns table (listing_id uuid, views bigint, contacts bigint, favorites bigint)
language sql security definer set search_path = public stable as $$
  select l.id,
    (select count(*) from listing_events e where e.listing_id = l.id and e.event = 'view'
       and e.created_at > now() - make_interval(days => p_days)),
    (select count(*) from listing_events e where e.listing_id = l.id and e.event = 'contact'
       and e.created_at > now() - make_interval(days => p_days)),
    (select count(*) from favorites f where f.listing_id = l.id
       and f.created_at > now() - make_interval(days => p_days))
  from listings l
  where l.owner_id = auth.uid();
$$;
grant execute on function public.owner_listing_stats to authenticated;

-- Daily view counts across all of the landlord's listings (one row per day, zeros included) for the chart.
create or replace function public.owner_views_by_day(p_days int default 7)
returns table (day date, views bigint)
language sql security definer set search_path = public stable as $$
  select d::date,
    (select count(*) from listing_events e
       join listings l on l.id = e.listing_id
      where l.owner_id = auth.uid() and e.event = 'view' and e.created_at::date = d::date)
  from generate_series(current_date - (p_days - 1), current_date, interval '1 day') as d
  order by d;
$$;
grant execute on function public.owner_views_by_day to authenticated;
