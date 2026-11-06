-- Run this once in the Supabase SQL editor, after migration_018_home_unit_type.sql.
-- Superadmin-only revenue stats for the admin dashboard.
-- listing_unlocks has default-deny RLS (migration_011); this security-definer
-- function is the only client-reachable read path, gated by is_superadmin().

create or replace function public.admin_revenue_stats()
returns table (
  total_revenue numeric,
  month_revenue numeric,
  successful_unlocks_count bigint,
  month_label text,
  month_revenue_series numeric
)
language plpgsql security definer set search_path = public stable as $$
begin
  if not public.is_superadmin() then
    raise exception 'not authorized';
  end if;
  return query
    with months as (
      select date_trunc('month', now()) - (n || ' months')::interval as month_start
      from generate_series(0, 5) as n
    ),
    monthly as (
      select to_char(m.month_start, 'Mon') as ml,
             coalesce(sum(u.amount) filter (
               where u.status = 'successful'
               and u.created_at >= m.month_start
               and u.created_at < m.month_start + interval '1 month'
             ), 0) as mrs
      from months m
      left join listing_unlocks u on true
      group by m.month_start, ml
      order by m.month_start
    )
    select
      coalesce((select sum(amount) from listing_unlocks where status = 'successful'), 0),
      coalesce((select sum(amount) from listing_unlocks where status = 'successful' and created_at >= date_trunc('month', now())), 0),
      (select count(*) from listing_unlocks where status = 'successful'),
      monthly.ml, monthly.mrs
    from monthly;
end;
$$;
grant execute on function public.admin_revenue_stats to authenticated;
