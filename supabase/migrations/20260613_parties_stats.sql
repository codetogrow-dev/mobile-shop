-- =============================================================================
-- Customer & Supplier analytics + paginated list endpoints
--
-- Adds:
--   1. `customer_stats(uuid)` / `supplier_stats(uuid)` — lifetime totals for
--      one party (spent/purchased, visit/batch count, avg ticket, last
--      activity, current balance). Used by detail pages.
--   2. `customers_list_page` / `suppliers_list_page` — paginated list with
--      embedded stats; supports search and 5 sort modes. Returns
--      `total_count` alongside `rows`.
--   3. `customers_dashboard_summary` / `suppliers_dashboard_summary` — three
--      headline numbers for the dashboard widget.
--
-- All RPCs are SECURITY DEFINER and scope every query by `auth.uid()` so RLS
-- is preserved end-to-end. Run after `20260611_dues.sql`.
-- =============================================================================

-- ─── 1. Per-party detail stats ───────────────────────────────────────────────

create or replace function public.customer_stats(p_customer_id uuid)
returns table (
  customer_id      uuid,
  lifetime_spent   numeric,
  visit_count      integer,
  avg_ticket       numeric,
  last_visit_at    timestamptz,
  current_balance  numeric
)
language sql
security definer
as $$
  select
    p_customer_id,
    coalesce(sum(s.total_revenue), 0)::numeric                                 as lifetime_spent,
    count(*)::int                                                              as visit_count,
    case when count(*) > 0 then (sum(s.total_revenue) / count(*))::numeric
         else 0::numeric end                                                   as avg_ticket,
    max(s.sold_at)                                                             as last_visit_at,
    coalesce(sum(s.balance_due), 0)::numeric                                   as current_balance
  from public.sales s
  where s.user_id = auth.uid()
    and s.customer_id = p_customer_id;
$$;

create or replace function public.supplier_stats(p_supplier_id uuid)
returns table (
  supplier_id        uuid,
  lifetime_purchased numeric,
  batch_count        integer,
  avg_batch          numeric,
  last_purchase_at   timestamptz,
  current_balance    numeric
)
language sql
security definer
as $$
  select
    p_supplier_id,
    coalesce(sum(pb.quantity * pb.cost_price), 0)::numeric                     as lifetime_purchased,
    count(*)::int                                                              as batch_count,
    case when count(*) > 0 then (sum(pb.quantity * pb.cost_price) / count(*))::numeric
         else 0::numeric end                                                   as avg_batch,
    max(pb.purchased_at)                                                       as last_purchase_at,
    coalesce(sum(pb.balance_due), 0)::numeric                                  as current_balance
  from public.purchase_batches pb
  where pb.user_id = auth.uid()
    and pb.supplier_id = p_supplier_id;
$$;

-- ─── 2. Paginated list pages ─────────────────────────────────────────────────
--
-- Sort modes:
--   'name'      — alphabetical
--   'spent'     — lifetime_spent desc (default for customers)
--   'visits'    — visit_count desc
--   'recent'    — last_visit_at desc nulls last
--   'balance'   — current_balance desc (biggest debtor first)
--
-- Output row includes `total_count` (same value on every row) so the client
-- can compute `hasNextPage` without a second round-trip.

create or replace function public.customers_list_page(
  p_search text    default null,
  p_sort   text    default 'spent',
  p_offset integer default 0,
  p_limit  integer default 10
)
returns table (
  id               uuid,
  name             text,
  phone            text,
  cnic             text,
  address          text,
  notes            text,
  created_at       timestamptz,
  lifetime_spent   numeric,
  visit_count      integer,
  avg_ticket       numeric,
  last_visit_at    timestamptz,
  current_balance  numeric,
  total_count      integer
)
language sql
security definer
as $$
  with base as (
    select
      c.id, c.name, c.phone, c.cnic, c.address, c.notes, c.created_at,
      coalesce(agg.lifetime_spent, 0)::numeric                             as lifetime_spent,
      coalesce(agg.visit_count,    0)::int                                 as visit_count,
      coalesce(agg.avg_ticket,     0)::numeric                             as avg_ticket,
      agg.last_visit_at,
      coalesce(agg.current_balance, 0)::numeric                            as current_balance
    from public.customers c
    left join lateral (
      select
        sum(s.total_revenue)                                               as lifetime_spent,
        count(*)::int                                                      as visit_count,
        case when count(*) > 0 then sum(s.total_revenue) / count(*) end    as avg_ticket,
        max(s.sold_at)                                                     as last_visit_at,
        sum(s.balance_due)                                                 as current_balance
      from public.sales s
      where s.user_id = auth.uid()
        and s.customer_id = c.id
    ) agg on true
    where c.user_id = auth.uid()
      and (
        p_search is null
        or p_search = ''
        or c.name ilike '%' || p_search || '%'
        or coalesce(c.phone, '') ilike '%' || p_search || '%'
      )
  ),
  total as (select count(*)::int as total_count from base)
  select
    b.id, b.name, b.phone, b.cnic, b.address, b.notes, b.created_at,
    b.lifetime_spent, b.visit_count, b.avg_ticket, b.last_visit_at, b.current_balance,
    t.total_count
  from base b
  cross join total t
  order by
    case when p_sort = 'name'    then b.name end                  asc nulls last,
    case when p_sort = 'spent'   then b.lifetime_spent end        desc nulls last,
    case when p_sort = 'visits'  then b.visit_count end           desc nulls last,
    case when p_sort = 'recent'  then b.last_visit_at end         desc nulls last,
    case when p_sort = 'balance' then b.current_balance end       desc nulls last,
    b.name asc
  offset greatest(p_offset, 0)
  limit  least(greatest(p_limit, 1), 100);
$$;

create or replace function public.suppliers_list_page(
  p_search text    default null,
  p_sort   text    default 'spent',  -- 'spent' = lifetime_purchased
  p_offset integer default 0,
  p_limit  integer default 10
)
returns table (
  id                 uuid,
  name               text,
  phone              text,
  cnic               text,
  address            text,
  notes              text,
  created_at         timestamptz,
  lifetime_purchased numeric,
  batch_count        integer,
  avg_batch          numeric,
  last_purchase_at   timestamptz,
  current_balance    numeric,
  total_count        integer
)
language sql
security definer
as $$
  with base as (
    select
      sp.id, sp.name, sp.phone, sp.cnic, sp.address, sp.notes, sp.created_at,
      coalesce(agg.lifetime_purchased, 0)::numeric                              as lifetime_purchased,
      coalesce(agg.batch_count,        0)::int                                  as batch_count,
      coalesce(agg.avg_batch,          0)::numeric                              as avg_batch,
      agg.last_purchase_at,
      coalesce(agg.current_balance,    0)::numeric                              as current_balance
    from public.suppliers sp
    left join lateral (
      select
        sum(pb.quantity * pb.cost_price)                                        as lifetime_purchased,
        count(*)::int                                                           as batch_count,
        case when count(*) > 0
             then sum(pb.quantity * pb.cost_price) / count(*) end               as avg_batch,
        max(pb.purchased_at)                                                    as last_purchase_at,
        sum(pb.balance_due)                                                     as current_balance
      from public.purchase_batches pb
      where pb.user_id = auth.uid()
        and pb.supplier_id = sp.id
    ) agg on true
    where sp.user_id = auth.uid()
      and (
        p_search is null
        or p_search = ''
        or sp.name ilike '%' || p_search || '%'
        or coalesce(sp.phone, '') ilike '%' || p_search || '%'
      )
  ),
  total as (select count(*)::int as total_count from base)
  select
    b.id, b.name, b.phone, b.cnic, b.address, b.notes, b.created_at,
    b.lifetime_purchased, b.batch_count, b.avg_batch, b.last_purchase_at, b.current_balance,
    t.total_count
  from base b
  cross join total t
  order by
    case when p_sort = 'name'    then b.name end                       asc  nulls last,
    case when p_sort = 'spent'   then b.lifetime_purchased end         desc nulls last,
    case when p_sort = 'visits'  then b.batch_count end                desc nulls last,
    case when p_sort = 'recent'  then b.last_purchase_at end           desc nulls last,
    case when p_sort = 'balance' then b.current_balance end            desc nulls last,
    b.name asc
  offset greatest(p_offset, 0)
  limit  least(greatest(p_limit, 1), 100);
$$;

-- ─── 3. Dashboard summary RPCs ───────────────────────────────────────────────
--
-- "Today" / "This month" are interpreted in Asia/Karachi local time so the
-- numbers match the shopkeeper's wall clock.

create or replace function public.customers_dashboard_summary()
returns table (
  customers_today    integer,
  new_this_month     integer,
  top_customer_id    uuid,
  top_customer_name  text,
  top_customer_total numeric
)
language sql
security definer
as $$
  with karachi as (
    select (now() at time zone 'Asia/Karachi')::date as today
  ),
  today_range as (
    select
      (k.today::timestamp at time zone 'Asia/Karachi')                     as start_ts,
      ((k.today + 1)::timestamp at time zone 'Asia/Karachi')               as end_ts,
      date_trunc('month', k.today)::date                                   as month_start
    from karachi k
  ),
  served_today as (
    select count(distinct s.customer_id)::int as n
    from public.sales s, today_range r
    where s.user_id = auth.uid()
      and s.customer_id is not null
      and s.sold_at >= r.start_ts
      and s.sold_at <  r.end_ts
  ),
  new_month as (
    select count(*)::int as n
    from public.customers c, today_range r
    where c.user_id = auth.uid()
      and c.created_at >= r.month_start
  ),
  top_month as (
    select c.id, c.name, sum(s.total_revenue)::numeric as total
    from public.sales s
    join public.customers c on c.id = s.customer_id
    cross join today_range r
    where s.user_id = auth.uid()
      and s.sold_at >= r.month_start
    group by c.id, c.name
    order by total desc
    limit 1
  )
  select
    (select n from served_today),
    (select n from new_month),
    (select id    from top_month),
    (select name  from top_month),
    coalesce((select total from top_month), 0);
$$;

create or replace function public.suppliers_dashboard_summary()
returns table (
  active_today        integer,
  new_this_month      integer,
  top_supplier_id     uuid,
  top_supplier_name   text,
  top_supplier_total  numeric
)
language sql
security definer
as $$
  with karachi as (
    select (now() at time zone 'Asia/Karachi')::date as today
  ),
  today_range as (
    select
      (k.today::timestamp at time zone 'Asia/Karachi')                     as start_ts,
      ((k.today + 1)::timestamp at time zone 'Asia/Karachi')               as end_ts,
      date_trunc('month', k.today)::date                                   as month_start
    from karachi k
  ),
  active_today as (
    select count(distinct pb.supplier_id)::int as n
    from public.purchase_batches pb, today_range r
    where pb.user_id = auth.uid()
      and pb.supplier_id is not null
      and pb.purchased_at >= r.start_ts
      and pb.purchased_at <  r.end_ts
  ),
  new_month as (
    select count(*)::int as n
    from public.suppliers sp, today_range r
    where sp.user_id = auth.uid()
      and sp.created_at >= r.month_start
  ),
  top_month as (
    select sp.id, sp.name, sum(pb.quantity * pb.cost_price)::numeric as total
    from public.purchase_batches pb
    join public.suppliers sp on sp.id = pb.supplier_id
    cross join today_range r
    where pb.user_id = auth.uid()
      and pb.purchased_at >= r.month_start
    group by sp.id, sp.name
    order by total desc
    limit 1
  )
  select
    (select n from active_today),
    (select n from new_month),
    (select id   from top_month),
    (select name from top_month),
    coalesce((select total from top_month), 0);
$$;

-- =============================================================================
-- end migration
-- =============================================================================
