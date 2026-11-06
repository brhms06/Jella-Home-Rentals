-- Run this once in the Supabase SQL editor, after migration_013_superadmin_role.sql.
-- Fixes "infinite recursion detected in policy for relation profiles":
-- the superadmin policies on `profiles` queried `profiles` from within a
-- policy on `profiles` itself. A security definer function bypasses RLS
-- for that inner check, so it no longer re-triggers the same policy.

create or replace function public.is_superadmin()
returns boolean
language sql security definer set search_path = public stable as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'superadmin', false);
$$;
grant execute on function public.is_superadmin to authenticated;

drop policy if exists "superadmin can select all profiles" on profiles;
create policy "superadmin can select all profiles" on profiles
  for select using (public.is_superadmin());

drop policy if exists "superadmin can update all profiles" on profiles;
create policy "superadmin can update all profiles" on profiles
  for update using (public.is_superadmin());

drop policy if exists "superadmin can select all listings" on listings;
create policy "superadmin can select all listings" on listings
  for select using (public.is_superadmin());

drop policy if exists "superadmin can update listings" on listings;
create policy "superadmin can update listings" on listings
  for update using (public.is_superadmin());

drop policy if exists "superadmin can select all reports" on reports;
create policy "superadmin can select all reports" on reports
  for select using (public.is_superadmin());

drop policy if exists "superadmin can update reports" on reports;
create policy "superadmin can update reports" on reports
  for update using (public.is_superadmin());
