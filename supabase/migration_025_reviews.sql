-- Run once in the Supabase SQL editor, after migration_024_landlord_verification.sql.
-- Reviews: a 1-5 star rating with an optional comment. Only a device that PAID to unlock a listing
-- can review it (one review per device per listing), which keeps spam and fake reviews down.

create table reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  device_id text not null,
  rating int not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  hidden boolean not null default false, -- admins can hide abusive reviews
  created_at timestamptz not null default now(),
  unique (listing_id, device_id)
);
create index reviews_listing_idx on reviews (listing_id) where not hidden;
alter table reviews enable row level security;
-- No client policies: reads/writes go through the functions below (device ids are never returned).
create policy "superadmin can select all reviews" on reviews for select using (public.is_superadmin());
create policy "superadmin can update reviews" on reviews for update using (public.is_superadmin());

-- Has this device paid for the listing, and not reviewed it yet?
create or replace function public.can_review_listing(p_listing_id uuid, p_device_id text)
returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from listing_unlocks u
    where u.listing_id = p_listing_id and u.device_id = p_device_id and u.status = 'successful'
  ) and not exists (
    select 1 from reviews r where r.listing_id = p_listing_id and r.device_id = p_device_id
  );
$$;
grant execute on function public.can_review_listing to anon, authenticated;

create or replace function public.submit_review(p_listing_id uuid, p_device_id text, p_rating int, p_comment text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_review_listing(p_listing_id, p_device_id) then
    raise exception 'only renters who unlocked this listing can review it (once)';
  end if;
  insert into reviews (listing_id, device_id, rating, comment)
  values (p_listing_id, p_device_id, p_rating, nullif(trim(coalesce(p_comment, '')), ''));
end;
$$;
grant execute on function public.submit_review to anon, authenticated;

create or replace function public.listing_reviews(p_listing_id uuid)
returns table (id uuid, rating int, comment text, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select r.id, r.rating, r.comment, r.created_at
  from reviews r
  where r.listing_id = p_listing_id and not r.hidden
  order by r.created_at desc
  limit 20;
$$;
grant execute on function public.listing_reviews to anon, authenticated;

create or replace function public.listing_review_summary(p_listing_id uuid)
returns table (average numeric, total bigint)
language sql security definer set search_path = public stable as $$
  select coalesce(round(avg(rating)::numeric, 1), 0), count(*)
  from reviews where listing_id = p_listing_id and not hidden;
$$;
grant execute on function public.listing_review_summary to anon, authenticated;
