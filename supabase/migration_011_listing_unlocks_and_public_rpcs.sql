-- Run after migration_010_public_access_and_masking.sql.

create table listing_unlocks (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  device_id text not null,
  status text not null default 'pending' check (status in ('pending','successful','failed','expired')),
  fapshi_trans_id text,
  amount integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, device_id)
);
alter table listing_unlocks enable row level security;
-- No policies: default-deny. Only touched via Edge Functions using the service-role key.

create trigger listing_unlocks_set_updated_at
  before update on listing_unlocks
  for each row execute procedure public.set_updated_at();

-- Masked shape for the public browse list.
create or replace function public_listings(
  p_city text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_bedrooms int default null,
  p_sort text default 'newest'
)
returns table (
  id uuid, title text, description text, city text, price numeric,
  bedrooms int, bathrooms numeric, amenities text[], photos jsonb,
  status text, verification_status text, created_at timestamptz
)
language sql security definer set search_path = public as $$
  select l.id, l.title, l.description, l.city, l.price, l.bedrooms, l.bathrooms,
         l.amenities, l.photos, l.status, l.verification_status, l.created_at
  from listings l
  where l.status = 'active' and l.verification_status = 'verified'
    and (p_city is null or l.city ilike '%' || p_city || '%')
    and (p_min_price is null or l.price >= p_min_price)
    and (p_max_price is null or l.price <= p_max_price)
    and (p_min_bedrooms is null or l.bedrooms >= p_min_bedrooms)
  order by
    case p_sort when 'price_asc' then l.price when 'price_desc' then -l.price else null end asc nulls last,
    l.created_at desc;
$$;
grant execute on function public_listings to anon, authenticated;

-- Single listing, conditionally unmasked based on a successful unlock for p_device_id.
create or replace function public_listing(p_id uuid, p_device_id text default null)
returns table (
  id uuid, title text, description text, address text, city text,
  lat double precision, lng double precision, price numeric,
  bedrooms int, bathrooms numeric, amenities text[], photos jsonb,
  status text, verification_status text, created_at timestamptz,
  owner_full_name text, owner_whatsapp_number text, unlocked boolean
)
language sql security definer set search_path = public as $$
  select
    l.id, l.title, l.description,
    case when u.id is not null then l.address else null end,
    l.city,
    case when u.id is not null then l.lat else null end,
    case when u.id is not null then l.lng else null end,
    l.price, l.bedrooms, l.bathrooms, l.amenities, l.photos,
    l.status, l.verification_status, l.created_at,
    case when u.id is not null then p.full_name else null end,
    case when u.id is not null then p.whatsapp_number else null end,
    (u.id is not null) as unlocked
  from listings l
  left join profiles p on p.id = l.owner_id
  left join listing_unlocks u
    on u.listing_id = l.id and u.device_id = p_device_id and u.status = 'successful'
  where l.id = p_id and l.status = 'active' and l.verification_status = 'verified';
$$;
grant execute on function public_listing to anon, authenticated;
