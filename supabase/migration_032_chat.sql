-- Run once in the Supabase SQL editor, after migration_031_maps.sql.
-- In-app chat between a renter (anonymous, device-based) and a listing's landlord.
-- Chat is a perk of the paid unlock: the FIRST message needs a successful unlock, after that the thread stays open.
-- No RLS policies on purpose: every read/write goes through the security-definer functions below.

create table conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  device_id text not null,
  renter_name text not null,
  owner_unread int not null default 0,
  renter_unread int not null default 0,
  last_message text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (listing_id, device_id)
);
create index conversations_device_idx on conversations (device_id, last_message_at desc);
create index conversations_listing_idx on conversations (listing_id, last_message_at desc);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender text not null check (sender in ('renter', 'owner')),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at);

alter table conversations enable row level security;
alter table messages enable row level security;

-- Renter: send a message (creates the conversation on the first one).
create or replace function public.renter_send_message(
  p_listing_id uuid, p_device_id text, p_name text, p_body text
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
  b text := left(trim(coalesce(p_body, '')), 1000);
begin
  if b = '' or coalesce(p_device_id, '') = '' or coalesce(trim(p_name), '') = '' then
    raise exception 'name and message required';
  end if;
  select c.id into cid from conversations c where c.listing_id = p_listing_id and c.device_id = p_device_id;
  if cid is null then
    if not exists (select 1 from listings l where l.id = p_listing_id and l.status = 'active') then
      raise exception 'listing not available';
    end if;
    if not exists (select 1 from listing_unlocks u
                   where u.listing_id = p_listing_id and u.device_id = p_device_id and u.status = 'successful') then
      raise exception 'unlock required';
    end if;
    insert into conversations (listing_id, device_id, renter_name)
    values (p_listing_id, p_device_id, trim(p_name)) returning id into cid;
  end if;
  if (select count(*) from messages m
      where m.conversation_id = cid and m.sender = 'renter' and m.created_at > now() - interval '1 minute') >= 10 then
    raise exception 'slow down';
  end if;
  insert into messages (conversation_id, sender, body) values (cid, 'renter', b);
  update conversations c
     set renter_name = trim(p_name), last_message = left(b, 200), last_message_at = now(), owner_unread = c.owner_unread + 1
   where c.id = cid;
end;
$$;
grant execute on function public.renter_send_message to anon, authenticated;

-- Renter: the thread for one listing (also clears their unread count).
create or replace function public.renter_messages(p_listing_id uuid, p_device_id text)
returns table (id uuid, sender text, body text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select c.id into cid from conversations c where c.listing_id = p_listing_id and c.device_id = p_device_id;
  if cid is null then return; end if;
  update conversations c set renter_unread = 0 where c.id = cid and c.renter_unread <> 0;
  return query
    select t.id, t.sender, t.body, t.created_at from (
      select m.id, m.sender, m.body, m.created_at from messages m
      where m.conversation_id = cid order by m.created_at desc limit 200
    ) t order by t.created_at;
end;
$$;
grant execute on function public.renter_messages to anon, authenticated;

-- Renter: all of this device's conversations.
create or replace function public.renter_conversations(p_device_id text)
returns table (
  id uuid, listing_id uuid, listing_title text, photo text,
  last_message text, last_message_at timestamptz, unread int
)
language sql security definer set search_path = public stable as $$
  select c.id, c.listing_id, l.title, l.photos->>0, c.last_message, c.last_message_at, c.renter_unread
  from conversations c join listings l on l.id = c.listing_id
  where c.device_id = p_device_id
  order by c.last_message_at desc;
$$;
grant execute on function public.renter_conversations to anon, authenticated;

-- Landlord: conversations on their own listings.
create or replace function public.owner_conversations()
returns table (
  id uuid, listing_id uuid, listing_title text, renter_name text,
  last_message text, last_message_at timestamptz, unread int
)
language sql security definer set search_path = public stable as $$
  select c.id, c.listing_id, l.title, c.renter_name, c.last_message, c.last_message_at, c.owner_unread
  from conversations c join listings l on l.id = c.listing_id
  where l.owner_id = auth.uid()
  order by c.last_message_at desc;
$$;
grant execute on function public.owner_conversations to authenticated;

-- Landlord: one thread (also clears their unread count).
create or replace function public.owner_messages(p_conversation_id uuid)
returns table (id uuid, sender text, body text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from conversations c join listings l on l.id = c.listing_id
                 where c.id = p_conversation_id and l.owner_id = auth.uid()) then
    raise exception 'not found';
  end if;
  update conversations c set owner_unread = 0 where c.id = p_conversation_id and c.owner_unread <> 0;
  return query
    select t.id, t.sender, t.body, t.created_at from (
      select m.id, m.sender, m.body, m.created_at from messages m
      where m.conversation_id = p_conversation_id order by m.created_at desc limit 200
    ) t order by t.created_at;
end;
$$;
grant execute on function public.owner_messages to authenticated;

-- Landlord: reply.
create or replace function public.owner_send_message(p_conversation_id uuid, p_body text)
returns void
language plpgsql security definer set search_path = public as $$
declare b text := left(trim(coalesce(p_body, '')), 1000);
begin
  if b = '' then raise exception 'message required'; end if;
  if not exists (select 1 from conversations c join listings l on l.id = c.listing_id
                 where c.id = p_conversation_id and l.owner_id = auth.uid()) then
    raise exception 'not found';
  end if;
  insert into messages (conversation_id, sender, body) values (p_conversation_id, 'owner', b);
  update conversations c
     set last_message = left(b, 200), last_message_at = now(), renter_unread = c.renter_unread + 1
   where c.id = p_conversation_id;
end;
$$;
grant execute on function public.owner_send_message to authenticated;
