-- Run once in the Supabase SQL editor, after migration_025_reviews.sql.
-- Boost listings: a landlord pays (Fapshi mobile money) to feature a listing for N days. Boosted listings
-- sort first in the default ("newest") browse order and show a "Featured" badge.

alter table listings add column boosted_until timestamptz;

create table listing_boosts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  owner_id uuid not null,
  days int not null,
  amount integer not null,
  status text not null default 'pending' check (status in ('pending','successful','failed','expired')),
  fapshi_trans_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listing_boosts_trans_idx on listing_boosts (fapshi_trans_id);
alter table listing_boosts enable row level security;
-- Owners may read their own boosts; writes happen only in Edge Functions (service role).
create policy "owners read their boosts" on listing_boosts for select using (owner_id = auth.uid());
create policy "superadmin reads all boosts" on listing_boosts for select using (public.is_superadmin());

create trigger listing_boosts_set_updated_at
  before update on listing_boosts
  for each row execute procedure public.set_updated_at();

-- The existing "update own listing" policy lets a landlord write ANY column of their row, so without this
-- they could grant themselves a free boost. Only apply_boost_status (below) may change boosted_until.
create or replace function public.protect_boosted_until()
returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('jella.allow_boost', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.boosted_until := null;
  elsif new.boosted_until is distinct from old.boosted_until then
    new.boosted_until := old.boosted_until;
  end if;
  return new;
end;
$$;
create trigger listings_protect_boosted_until
  before insert or update on listings
  for each row execute procedure public.protect_boosted_until();

-- Called by the fapshi-webhook Edge Function (service role only). Idempotent: a repeated SUCCESSFUL
-- webhook never extends the boost twice. Extending stacks onto any boost that is still running.
create or replace function public.apply_boost_status(p_trans_id text, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  b listing_boosts%rowtype;
begin
  select * into b from listing_boosts where fapshi_trans_id = p_trans_id for update;
  if not found or b.status = 'successful' then
    return;
  end if;
  update listing_boosts set status = p_status where id = b.id;
  if p_status = 'successful' then
    perform set_config('jella.allow_boost', 'on', true);
    update listings
       set boosted_until = greatest(coalesce(boosted_until, now()), now()) + make_interval(days => b.days)
     where id = b.listing_id;
  end if;
end;
$$;
revoke execute on function public.apply_boost_status(text, text) from public, anon, authenticated;
grant execute on function public.apply_boost_status(text, text) to service_role;

-- Public browse list now also returns is_boosted and floats boosted listings to the top for the default
-- "newest" order (price sorts stay strictly by price). Supersedes migration_024's version.
drop function if exists public_listings(text, numeric, numeric, int, text, text, numeric, text);

create or replace function public_listings(
  p_city text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_bedrooms int default null,
  p_property_type text default null,
  p_sort text default 'newest',
  p_min_bathrooms numeric default null,
  p_unit_type text default null
)
returns table (
  id uuid, title text, description text, city text, price numeric,
  bedrooms int, bathrooms numeric, amenities text[], photos jsonb,
  property_type text, unit_type text, status text, verification_status text, created_at timestamptz,
  availability text, available_from date, owner_verified boolean, is_boosted boolean
)
language sql security definer set search_path = public as $$
  select l.id, l.title, l.description, l.city, l.price, l.bedrooms, l.bathrooms,
         l.amenities, l.photos, l.property_type, l.unit_type, l.status, l.verification_status, l.created_at,
         l.availability, l.available_from, (p.id_status = 'verified'),
         (l.boosted_until is not null and l.boosted_until > now())
  from listings l
  left join profiles p on p.id = l.owner_id
  where l.status = 'active' and l.verification_status = 'verified'
    and (p_city is null or l.city ilike '%' || p_city || '%')
    and (p_min_price is null or l.price >= p_min_price)
    and (p_max_price is null or l.price <= p_max_price)
    and (p_min_bedrooms is null or l.bedrooms >= p_min_bedrooms)
    and (p_property_type is null or l.property_type = p_property_type)
    and (p_min_bathrooms is null or l.bathrooms >= p_min_bathrooms)
    and (p_unit_type is null or l.unit_type = p_unit_type)
  order by
    case when p_sort = 'newest' and l.boosted_until > now() then 0 else 1 end,
    case p_sort when 'price_asc' then l.price when 'price_desc' then -l.price else null end asc nulls last,
    l.created_at desc;
$$;
grant execute on function public_listings to anon, authenticated;
