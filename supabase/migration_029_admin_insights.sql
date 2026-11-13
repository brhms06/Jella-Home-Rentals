-- Run once in the Supabase SQL editor, after migration_028_price_drops.sql.
-- Admin insights: boost revenue, top-performing listings, and a moderation history (who did what, when).

-- Boost revenue + active boosts (superadmin only).
create or replace function public.admin_boost_stats()
returns table (total_revenue numeric, month_revenue numeric, successful_count bigint, active_count bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_superadmin() then
    raise exception 'not authorized';
  end if;
  return query select
    coalesce((select sum(amount) from listing_boosts where status = 'successful'), 0),
    coalesce((select sum(amount) from listing_boosts where status = 'successful' and created_at >= date_trunc('month', now())), 0),
    (select count(*) from listing_boosts where status = 'successful'),
    (select count(*) from listings where boosted_until > now());
end;
$$;
grant execute on function public.admin_boost_stats to authenticated;

-- Top 5 listings by views over the last p_days days.
create or replace function public.admin_top_listings(p_days int default 30)
returns table (listing_id uuid, title text, city text, views bigint, contacts bigint, favorites bigint)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_superadmin() then
    raise exception 'not authorized';
  end if;
  return query
    select l.id, l.title, l.city,
      (select count(*) from listing_events e where e.listing_id = l.id and e.event = 'view' and e.created_at > now() - make_interval(days => p_days)),
      (select count(*) from listing_events e where e.listing_id = l.id and e.event = 'contact' and e.created_at > now() - make_interval(days => p_days)),
      (select count(*) from favorites f where f.listing_id = l.id and f.created_at > now() - make_interval(days => p_days))
    from listings l
    order by 4 desc, 6 desc
    limit 5;
end;
$$;
grant execute on function public.admin_top_listings to authenticated;

-- Moderation history. Rows are written only by the trigger below, read only by superadmins.
create table moderation_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index moderation_log_created_idx on moderation_log (created_at desc);
alter table moderation_log enable row level security;
create policy "superadmin reads moderation log" on moderation_log for select using (public.is_superadmin());

create or replace function public.log_moderation()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  act text;
  info text;
begin
  -- only admin actions are history; landlords editing their own rows are not
  if auth.uid() is null or not public.is_superadmin() then
    return new;
  end if;

  -- nested ifs on purpose: `new.<column>` only exists on its own table, so never mix them in one condition
  if tg_table_name = 'listings' then
    if new.verification_status is distinct from old.verification_status then
      act := 'listing_' || new.verification_status;
      info := new.title;
    end if;
  elsif tg_table_name = 'reports' then
    if new.status is distinct from old.status then
      act := 'report_' || new.status;
      info := left(new.reason, 80);
    end if;
  elsif tg_table_name = 'reviews' then
    if new.hidden is distinct from old.hidden then
      act := case when new.hidden then 'review_hidden' else 'review_unhidden' end;
      info := coalesce(left(new.comment, 80), new.rating || ' stars');
    end if;
  elsif tg_table_name = 'profiles' then
    if new.suspended is distinct from old.suspended then
      act := case when new.suspended then 'landlord_suspended' else 'landlord_unsuspended' end;
      info := new.full_name;
    elsif new.id_status is distinct from old.id_status and new.id_status in ('verified', 'rejected') then
      act := 'id_' || new.id_status;
      info := new.full_name;
    end if;
  end if;

  if act is not null then
    insert into moderation_log (actor, action, detail) values (auth.uid(), act, info);
  end if;
  return new;
end;
$$;

create trigger listings_log_moderation after update on listings for each row execute procedure public.log_moderation();
create trigger reports_log_moderation after update on reports for each row execute procedure public.log_moderation();
create trigger reviews_log_moderation after update on reviews for each row execute procedure public.log_moderation();
create trigger profiles_log_moderation after update on profiles for each row execute procedure public.log_moderation();

create or replace function public.admin_moderation_log(p_limit int default 40)
returns table (id uuid, action text, detail text, actor_name text, created_at timestamptz)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_superadmin() then
    raise exception 'not authorized';
  end if;
  return query
    select m.id, m.action, m.detail, p.full_name, m.created_at
    from moderation_log m
    left join profiles p on p.id = m.actor
    order by m.created_at desc
    limit p_limit;
end;
$$;
grant execute on function public.admin_moderation_log to authenticated;
