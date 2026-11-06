-- Run this once in the Supabase SQL editor, after migration_019_admin_revenue_stats.sql.
-- Adds profile photo + country to profiles, and a storage bucket for avatars
-- (mirrors the listing-photos bucket/policies set up in migration.sql).

alter table profiles add column avatar_url text;
alter table profiles add column country text;

insert into storage.buckets (id, name, public)
values ('avatar-photos', 'avatar-photos', true);

create policy "public read avatar photos" on storage.objects
  for select using (bucket_id = 'avatar-photos');

create policy "owners upload their avatar photos" on storage.objects
  for insert with check (
    bucket_id = 'avatar-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owners delete their avatar photos" on storage.objects
  for delete using (
    bucket_id = 'avatar-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
