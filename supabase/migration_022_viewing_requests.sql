-- Run once in the Supabase SQL editor, after migration_021_listing_analytics.sql.
-- Viewing requests: a renter proposes a day and time slot; the landlord accepts or declines in-app.
-- Deliberately collects NO phone number: the landlord's contact stays behind the paid unlock,
-- and the renter sees the answer in the app (device-based, like favorites).

create table viewing_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  device_id text not null,
  renter_name text not null,
  preferred_date date not null,
  preferred_slot text not null check (preferred_slot in ('morning', 'afternoon', 'evening')),
  note text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index viewing_requests_listing_idx on viewing_requests (listing_id, status);
create index viewing_requests_device_idx on viewing_requests (device_id);
alter table viewing_requests enable row level security;
-- No policies: every read/write goes through the security-definer functions below.

create trigger viewing_requests_set_updated_at
  before update on viewing_requests
  for each row execute procedure public.set_updated_at();

-- Renter: create a request (anonymous, device-based).
create or replace function public.create_viewing_request(
  p_listing_id uuid, p_device_id text, p_name text,
  p_date date, p_slot text, p_note text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(p_device_id, '') = '' then
    raise exception 'name required';
  end if;
  if p_date < current_date then
    raise exception 'date is in the past';
  end if;
  if not exists (select 1 from listings where id = p_listing_id and status = 'active') then
    raise exception 'listing not available';
  end if;
  if (select count(*) from viewing_requests
       where listing_id = p_listing_id and device_id = p_device_id and status = 'pending') >= 3 then
    raise exception 'too many pending requests for this listing';
  end if;
  insert into viewing_requests (listing_id, device_id, renter_name, preferred_date, preferred_slot, note)
  values (p_listing_id, p_device_id, trim(p_name), p_date, p_slot, nullif(trim(coalesce(p_note, '')), ''))
  returning id into new_id;
  return new_id;
end;
$$;
grant execute on function public.create_viewing_request to anon, authenticated;

-- Renter: see own requests and their status.
create or replace function public.my_viewing_requests(p_device_id text)
returns table (
  id uuid, listing_id uuid, listing_title text, preferred_date date,
  preferred_slot text, status text, created_at timestamptz
)
language sql security definer set search_path = public stable as $$
  select r.id, r.listing_id, l.title, r.preferred_date, r.preferred_slot, r.status, r.created_at
  from viewing_requests r join listings l on l.id = r.listing_id
  where r.device_id = p_device_id
  order by r.created_at desc;
$$;
grant execute on function public.my_viewing_requests to anon, authenticated;

-- Renter: cancel own pending request.
create or replace function public.cancel_viewing_request(p_id uuid, p_device_id text)
returns void
language sql security definer set search_path = public as $$
  update viewing_requests set status = 'cancelled'
  where id = p_id and device_id = p_device_id and status = 'pending';
$$;
grant execute on function public.cancel_viewing_request to anon, authenticated;

-- Landlord: all requests on their own listings.
create or replace function public.owner_viewing_requests()
returns table (
  id uuid, listing_id uuid, listing_title text, renter_name text, preferred_date date,
  preferred_slot text, note text, status text, created_at timestamptz
)
language sql security definer set search_path = public stable as $$
  select r.id, r.listing_id, l.title, r.renter_name, r.preferred_date, r.preferred_slot, r.note, r.status, r.created_at
  from viewing_requests r join listings l on l.id = r.listing_id
  where l.owner_id = auth.uid()
  order by (r.status = 'pending') desc, r.created_at desc;
$$;
grant execute on function public.owner_viewing_requests to authenticated;

-- Landlord: accept or decline a pending request on their own listing.
create or replace function public.respond_viewing_request(p_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('accepted', 'declined') then
    raise exception 'invalid status';
  end if;
  update viewing_requests r set status = p_status
  where r.id = p_id and r.status = 'pending'
    and exists (select 1 from listings l where l.id = r.listing_id and l.owner_id = auth.uid());
end;
$$;
grant execute on function public.respond_viewing_request to authenticated;
