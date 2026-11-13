-- Demo listings WITH map coordinates, for trying Explore map, Discover, navigation and price drops.
-- Owned by the first landlord account; ids are fixed so they are easy to remove:
--   delete from listings where id::text like '00000000-0000-4000-8000-0000000000%';
-- Photos are placeholder images from picsum.photos (stable per seed).

with owner as (select id from auth.users where id = 'e102a743-a667-447b-a440-074ba05eaf73')
insert into listings
  (id, owner_id, title, description, address, city, lat, lng, price, bedrooms, bathrooms,
   amenities, photos, property_type, access_mode, nearby, neighbourhood_note, previous_price, price_dropped_at)
select v.id::uuid, owner.id, v.title, v.description, v.address, v.city, v.lat, v.lng, v.price, v.bedrooms, v.bathrooms,
       v.amenities, to_jsonb(array[
         'https://picsum.photos/seed/' || v.seed || '-a/900/700',
         'https://picsum.photos/seed/' || v.seed || '-b/900/700',
         'https://picsum.photos/seed/' || v.seed || '-c/900/700']),
       v.ptype, v.access_mode, v.nearby, v.note, v.prev, case when v.prev is not null then now() end
from owner, (values
  ('00000000-0000-4000-8000-000000000001','Molyko Student Studio','Quiet studio a short walk from campus, tiled floor, own entrance.','Molyko Junction','Buea',4.1590,9.2640,35000,1,1,array['wifi','furnished'],'home','foot',array['school','market','transport'],'3 min walk to the campus gate','m1',null::numeric),
  ('00000000-0000-4000-8000-000000000002','Bokwango Two-Bedroom','Bright two-bedroom with a small veranda and steady water.','Bokwango','Buea',4.1620,9.2750,60000,2,1,array['parking','laundry'],'home','foot',array['market','pharmacy'],null,'m2',70000),
  ('00000000-0000-4000-8000-000000000003','Great Soppo Family Home','Three-bedroom house with a compound, gate and parking.','Great Soppo','Buea',4.1700,9.2450,95000,3,2,array['parking','wifi','pets_allowed'],'home','car',array['school','hospital','bank'],'Tarred road all the way to the gate','m3',null),
  ('00000000-0000-4000-8000-000000000004','Buea Town Apartment','Modern apartment in the town centre, close to everything.','Buea Town','Buea',4.1560,9.2420,80000,2,2,array['wifi','furnished','parking'],'home','car',array['bank','restaurants','transport'],null,'m4',null),
  ('00000000-0000-4000-8000-000000000005','Muea Quiet Room','Self-contained room in a calm compound, 24h water.','Muea','Buea',4.1280,9.3000,25000,1,1,array['laundry'],'home','foot',array['market','worship'],'Footpath access, no car road','m5',null),
  ('00000000-0000-4000-8000-000000000006','Mile 17 Guest House','Clean guest house rooms by the main road, daily or monthly.','Mile 17','Buea',4.1500,9.3110,45000,1,1,array['wifi','parking'],'guest_house','car',array['transport','restaurants'],null,'m6',55000),
  ('00000000-0000-4000-8000-000000000007','Limbe Beach Guest House','Sea-breeze guest house five minutes from Down Beach.','Down Beach','Limbe',4.0186,9.2050,90000,2,2,array['wifi','furnished','parking'],'guest_house','car',array['restaurants','market'],'Walk to the beach in 5 minutes','m7',null),
  ('00000000-0000-4000-8000-000000000008','Bonamoussadi Apartment','Spacious apartment in a gated block with a generator.','Bonamoussadi','Douala',4.0800,9.7390,120000,3,2,array['wifi','parking','furnished'],'home','car',array['school','bank','hospital'],null,'m8',null)
) as v(id,title,description,address,city,lat,lng,price,bedrooms,bathrooms,amenities,ptype,access_mode,nearby,note,seed,prev)
on conflict (id) do nothing;

-- The price-drop trigger ignores previous_price on insert, so make two real drops by editing the price.
update listings set price = 70000 where id = '00000000-0000-4000-8000-000000000002';
update listings set price = 55000 where id = '00000000-0000-4000-8000-000000000006';
update listings set price = 60000 where id = '00000000-0000-4000-8000-000000000002';
update listings set price = 45000 where id = '00000000-0000-4000-8000-000000000006';
-- Boosts are protected by a trigger (payment only), so boost one demo listing from the app to test Discover.
