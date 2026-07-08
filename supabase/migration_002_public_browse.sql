-- Run this once in the Supabase SQL editor, after migration.sql.

alter table profiles add column whatsapp_number text;

create policy "public can view active listings" on listings
  for select using (status = 'active');

create policy "public can view profile whatsapp info" on profiles
  for select using (true);
