-- Run once in the Supabase SQL editor, after migration_026_boost_listings.sql.
-- Landlord inbox: the renters who tapped "Contact via WhatsApp" on the landlord's listings (anonymous events).

create or replace function public.owner_contact_events(p_limit int default 50)
returns table (id uuid, listing_id uuid, listing_title text, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select e.id, e.listing_id, l.title, e.created_at
  from listing_events e
  join listings l on l.id = e.listing_id
  where l.owner_id = auth.uid() and e.event = 'contact'
  order by e.created_at desc
  limit p_limit;
$$;
grant execute on function public.owner_contact_events to authenticated;
