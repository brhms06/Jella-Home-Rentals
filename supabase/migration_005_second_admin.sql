-- Run this once in the Supabase SQL editor, after migration_004_admin_commission.sql.

alter policy "admin can select all listings" on listings
  using (auth.jwt() ->> 'email' in ('broomuhams@gmail.com', 'anyangwagodwill10@gmail.com'));

alter policy "admin can update listings" on listings
  using (auth.jwt() ->> 'email' in ('broomuhams@gmail.com', 'anyangwagodwill10@gmail.com'));
