-- Run once in the Supabase SQL editor, after migration_032_chat.sql.
-- Push notifications for chat. Devices register an Expo push token (renters by device id, landlords by account);
-- a trigger on new messages posts to Expo's push API through pg_net (no edge function needed).
-- ponytail: no receipt handling, so tokens of uninstalled apps linger; prune on DeviceNotRegistered if that ever matters.
-- If you turn on Expo "enhanced push security", add an Authorization header in notify_chat_message().

create extension if not exists pg_net;

create table push_tokens (
  token text primary key,
  device_id text,
  user_id uuid references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  check ((device_id is null) <> (user_id is null))
);
create index push_tokens_device_idx on push_tokens (device_id);
create index push_tokens_user_idx on push_tokens (user_id);
alter table push_tokens enable row level security;
-- No policies: access only through the functions below.

-- A token belongs to whoever registered it last: a landlord login, or an anonymous renter device.
create or replace function public.register_push_token(p_token text, p_device_id text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_token, '') = '' then raise exception 'token required'; end if;
  if auth.uid() is not null then
    insert into push_tokens (token, user_id) values (p_token, auth.uid())
    on conflict (token) do update set user_id = auth.uid(), device_id = null, updated_at = now();
  elsif coalesce(p_device_id, '') <> '' then
    insert into push_tokens (token, device_id) values (p_token, p_device_id)
    on conflict (token) do update set device_id = p_device_id, user_id = null, updated_at = now();
  end if;
end;
$$;
grant execute on function public.register_push_token to anon, authenticated;

-- Called on log out so a shared phone stops receiving that landlord's messages.
create or replace function public.unregister_push_token(p_token text)
returns void
language sql security definer set search_path = public as $$
  delete from push_tokens where token = p_token and user_id = auth.uid();
$$;
grant execute on function public.unregister_push_token to authenticated;

create or replace function public.notify_chat_message()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  conv conversations%rowtype;
  l_title text;
  l_owner uuid;
  msgs jsonb;
begin
  select * into conv from conversations where id = new.conversation_id;
  select l.title, l.owner_id into l_title, l_owner from listings l where l.id = conv.listing_id;

  if new.sender = 'renter' then
    select jsonb_agg(jsonb_build_object(
      'to', t.token, 'sound', 'default',
      'title', conv.renter_name || ' · ' || l_title, 'body', left(new.body, 120),
      'data', jsonb_build_object('type', 'chat', 'role', 'owner', 'conversationId', conv.id, 'name', conv.renter_name)))
    into msgs from push_tokens t where t.user_id = l_owner;
  else
    select jsonb_agg(jsonb_build_object(
      'to', t.token, 'sound', 'default',
      'title', l_title, 'body', left(new.body, 120),
      'data', jsonb_build_object('type', 'chat', 'role', 'renter', 'listingId', conv.listing_id, 'title', l_title)))
    into msgs from push_tokens t where t.device_id = conv.device_id;
  end if;

  if msgs is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := msgs,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json')
    );
  end if;
  return new;
exception when others then
  return new; -- a failed push must never block a message
end;
$$;

create trigger messages_notify after insert on messages
  for each row execute function public.notify_chat_message();
