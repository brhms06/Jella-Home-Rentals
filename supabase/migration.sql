-- Run this once in the Supabase SQL editor for your project.

-- profiles: one row per authenticated user
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "select own profile" on profiles
  for select using (auth.uid() = id);

create policy "update own profile" on profiles
  for update using (auth.uid() = id);

-- auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- listings: landlord's rental properties
create table listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  address text,
  city text,
  lat double precision,
  lng double precision,
  price numeric not null,
  bedrooms int,
  bathrooms numeric,
  amenities text[] not null default '{}',
  photos jsonb not null default '[]',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table listings enable row level security;

create policy "select own listings" on listings
  for select using (auth.uid() = owner_id);

create policy "insert own listings" on listings
  for insert with check (auth.uid() = owner_id);

create policy "update own listings" on listings
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "delete own listings" on listings
  for delete using (auth.uid() = owner_id);

-- keep updated_at current on edits
create function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger listings_set_updated_at
  before update on listings
  for each row execute procedure public.set_updated_at();

-- storage bucket for listing photos
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true);

create policy "public read listing photos" on storage.objects
  for select using (bucket_id = 'listing-photos');

create policy "owners upload their listing photos" on storage.objects
  for insert with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owners delete their listing photos" on storage.objects
  for delete using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
