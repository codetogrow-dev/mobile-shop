-- =============================================================================
-- Credit / Partial-Payments Tracking
--
-- Adds:
--   1. `customers` and `suppliers` tables (full entities with contact info).
--   2. `payments` table — one row per partial/full payment on a purchase or sale.
--   3. Payment columns on `purchase_batches` and `sales`
--      (supplier_id/customer_id, amount_paid, balance_due, due_date,
--       payment_status). `balance_due` and `payment_status` are GENERATED;
--       `amount_paid` is maintained by an AFTER trigger on `payments`.
--   4. Extended `record_purchase` / `record_sale` RPCs (accept supplier/customer
--      + initial payment + due_date). New `record_payment` RPC for installments.
--      Extended `delete_sale` / new `delete_purchase` block when payments exist.
--   5. Aggregate RPCs for the Dues tab and dashboard banner.
--
-- `balance_due > 0 AND due_date < current_date` defines overdue (computed on read).
-- Existing transactions are back-filled as fully paid so the Dues tab is clean
-- on first launch.
-- =============================================================================

-- ─── 1. Parties ──────────────────────────────────────────────────────────────

create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  tenant_id   uuid not null,
  name        text not null,
  phone       text,
  cnic        text,
  address     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists customers_tenant_name_uidx
  on public.customers (tenant_id, lower(name));
create index if not exists customers_tenant_idx
  on public.customers (tenant_id);

create table if not exists public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  tenant_id   uuid not null,
  name        text not null,
  phone       text,
  cnic        text,
  address     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists suppliers_tenant_name_uidx
  on public.suppliers (tenant_id, lower(name));
create index if not exists suppliers_tenant_idx
  on public.suppliers (tenant_id);

alter table public.customers enable row level security;
alter table public.suppliers enable row level security;

drop policy if exists customers_select on public.customers;
drop policy if exists customers_insert on public.customers;
drop policy if exists customers_update on public.customers;
drop policy if exists customers_delete on public.customers;
create policy customers_select on public.customers for select using (auth.uid() = user_id);
create policy customers_insert on public.customers for insert with check (auth.uid() = user_id);
create policy customers_update on public.customers for update using (auth.uid() = user_id);
create policy customers_delete on public.customers for delete using (auth.uid() = user_id);

drop policy if exists suppliers_select on public.suppliers;
drop policy if exists suppliers_insert on public.suppliers;
drop policy if exists suppliers_update on public.suppliers;
drop policy if exists suppliers_delete on public.suppliers;
create policy suppliers_select on public.suppliers for select using (auth.uid() = user_id);
create policy suppliers_insert on public.suppliers for insert with check (auth.uid() = user_id);
create policy suppliers_update on public.suppliers for update using (auth.uid() = user_id);
create policy suppliers_delete on public.suppliers for delete using (auth.uid() = user_id);

-- ─── 2. Payments ─────────────────────────────────────────────────────────────

create table if not exists public.payments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  tenant_id         uuid not null,
  transaction_type  text not null check (transaction_type in ('sale','purchase')),
  transaction_id    uuid not null,
  amount            numeric(12,2) not null check (amount > 0),
  paid_at           timestamptz not null default now(),
  method            text,
  note              text,
  created_at        timestamptz not null default now()
);
create index if not exists payments_tenant_txn_idx
  on public.payments (tenant_id, transaction_type, transaction_id);
create index if not exists payments_tenant_paid_at_idx
  on public.payments (tenant_id, paid_at desc);

alter table public.payments enable row level security;
drop policy if exists payments_select on public.payments;
drop policy if exists payments_insert on public.payments;
drop policy if exists payments_update on public.payments;
drop policy if exists payments_delete on public.payments;
create policy payments_select on public.payments for select using (auth.uid() = user_id);
create policy payments_insert on public.payments for insert with check (auth.uid() = user_id);
create policy payments_update on public.payments for update using (auth.uid() = user_id);
create policy payments_delete on public.payments for delete using (auth.uid() = user_id);

-- ─── 3. Add payment columns to existing tables ───────────────────────────────

-- Each `add column` is its own statement so a failure in one doesn't
-- silently leave the others un-added (Supabase SQL Editor commits per
-- statement).
alter table public.purchase_batches
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null;
alter table public.purchase_batches
  add column if not exists amount_paid numeric(12,2) not null default 0;
alter table public.purchase_batches
  add column if not exists due_date    date;

-- Drop generated columns first if a prior partial run left them, then recreate.
alter table public.purchase_batches drop column if exists balance_due;
alter table public.purchase_batches drop column if exists payment_status;
alter table public.purchase_batches
  add column balance_due numeric(12,2)
    generated always as (greatest((quantity * cost_price) - amount_paid, 0)) stored;
alter table public.purchase_batches
  add column payment_status text
    generated always as (
      case
        when amount_paid <= 0 then 'unpaid'
        when amount_paid >= (quantity * cost_price) then 'paid'
        else 'partial'
      end
    ) stored;

create index if not exists purchase_batches_balance_due_idx
  on public.purchase_batches (tenant_id) where balance_due > 0;
create index if not exists purchase_batches_supplier_idx
  on public.purchase_batches (supplier_id);

alter table public.sales
  add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.sales
  add column if not exists amount_paid numeric(12,2) not null default 0;
alter table public.sales
  add column if not exists due_date    date;

-- Defensive sanity check — if amount_paid isn't there, halt with a clear message.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'sales' and column_name = 'amount_paid'
  ) then
    raise exception 'sales.amount_paid is missing — re-run the column-add statement above before continuing';
  end if;
end$$;

alter table public.sales drop column if exists balance_due;
alter table public.sales drop column if exists payment_status;
-- NOTE: `total_revenue` on sales is itself a GENERATED column, so we cannot
-- reference it from another generated column. Inline the formula
-- (quantity * sale_price_per_unit) here instead.
alter table public.sales
  add column balance_due numeric(12,2)
    generated always as (greatest((quantity * sale_price_per_unit) - amount_paid, 0)) stored;
alter table public.sales
  add column payment_status text
    generated always as (
      case
        when amount_paid <= 0 then 'unpaid'
        when amount_paid >= (quantity * sale_price_per_unit) then 'paid'
        else 'partial'
      end
    ) stored;

create index if not exists sales_balance_due_idx
  on public.sales (tenant_id) where balance_due > 0;
create index if not exists sales_customer_idx
  on public.sales (customer_id);

-- Back-fill: treat all historical transactions as fully paid so the Dues tab
-- doesn't explode on first launch. Run once; idempotent because we set to total.
update public.purchase_batches
   set amount_paid = quantity * cost_price
 where amount_paid = 0;

update public.sales
   set amount_paid = total_revenue
 where amount_paid = 0;

-- ─── 4. Trigger: keep amount_paid in sync with payments ──────────────────────

create or replace function public._recompute_amount_paid(
  p_transaction_type text,
  p_transaction_id   uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_sum numeric(12,2);
begin
  select coalesce(sum(amount), 0)
    into v_sum
    from public.payments
   where transaction_type = p_transaction_type
     and transaction_id   = p_transaction_id;

  if p_transaction_type = 'sale' then
    update public.sales
       set amount_paid = v_sum
     where id = p_transaction_id;
  else
    update public.purchase_batches
       set amount_paid = v_sum
     where id = p_transaction_id;
  end if;
end;
$$;

create or replace function public._payments_validate_parent()
returns trigger
language plpgsql
as $$
declare
  v_tenant uuid;
  v_user   uuid;
begin
  if new.transaction_type = 'sale' then
    select tenant_id, user_id into v_tenant, v_user
      from public.sales where id = new.transaction_id;
  else
    select tenant_id, user_id into v_tenant, v_user
      from public.purchase_batches where id = new.transaction_id;
  end if;

  if v_tenant is null then
    raise exception 'payment.transaction_id % not found in %', new.transaction_id, new.transaction_type;
  end if;
  if v_tenant <> new.tenant_id or v_user <> new.user_id then
    raise exception 'payment tenant/user does not match parent transaction';
  end if;
  return new;
end;
$$;

drop trigger if exists payments_validate_parent on public.payments;
create trigger payments_validate_parent
  before insert on public.payments
  for each row execute function public._payments_validate_parent();

create or replace function public._payments_sync_parent()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public._recompute_amount_paid(old.transaction_type, old.transaction_id);
    return old;
  end if;

  perform public._recompute_amount_paid(new.transaction_type, new.transaction_id);

  -- If the row moved between transactions (rare, but allowed by update),
  -- also recompute the old parent.
  if tg_op = 'UPDATE'
     and (old.transaction_type <> new.transaction_type
          or old.transaction_id <> new.transaction_id) then
    perform public._recompute_amount_paid(old.transaction_type, old.transaction_id);
  end if;

  return new;
end;
$$;

drop trigger if exists payments_sync_parent on public.payments;
create trigger payments_sync_parent
  after insert or update or delete on public.payments
  for each row execute function public._payments_sync_parent();

-- ─── 5. Update guard: forbid lowering totals below amount_paid ───────────────

create or replace function public._purchase_batches_check_total()
returns trigger
language plpgsql
as $$
begin
  if (new.quantity * new.cost_price) < new.amount_paid then
    raise exception 'cannot reduce purchase total (%) below amount_paid (%)',
      new.quantity * new.cost_price, new.amount_paid;
  end if;
  return new;
end;
$$;
drop trigger if exists purchase_batches_check_total on public.purchase_batches;
create trigger purchase_batches_check_total
  before update on public.purchase_batches
  for each row execute function public._purchase_batches_check_total();

create or replace function public._sales_check_total()
returns trigger
language plpgsql
as $$
begin
  if new.total_revenue < new.amount_paid then
    raise exception 'cannot reduce sale total (%) below amount_paid (%)',
      new.total_revenue, new.amount_paid;
  end if;
  return new;
end;
$$;
drop trigger if exists sales_check_total on public.sales;
create trigger sales_check_total
  before update on public.sales
  for each row execute function public._sales_check_total();

-- ─── 6. RPCs: record_purchase / record_sale (extended) ──────────────────────

-- Drop any prior signatures first so we can change the parameter list safely.
drop function if exists public.record_purchase(uuid, integer, numeric, numeric, text, text, timestamptz, uuid);
drop function if exists public.record_purchase(uuid, integer, numeric, numeric, text, text, timestamptz, uuid, uuid, numeric, date);

create or replace function public.record_purchase(
  p_product_id       uuid,
  p_quantity         integer,
  p_cost_price       numeric,
  p_selling_price    numeric,
  p_supplier         text,
  p_notes            text,
  p_purchased_at     timestamptz,
  p_tenant_id        uuid,
  p_supplier_id      uuid    default null,
  p_initial_payment  numeric default 0,
  p_due_date         date    default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_batch_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.purchase_batches (
    user_id, tenant_id, product_id, quantity, quantity_remaining,
    cost_price, selling_price, supplier, supplier_id, notes,
    purchased_at, due_date, amount_paid
  )
  values (
    v_user_id, p_tenant_id, p_product_id, p_quantity, p_quantity,
    p_cost_price, p_selling_price, p_supplier, p_supplier_id, p_notes,
    p_purchased_at, p_due_date, 0
  )
  returning id into v_batch_id;

  update public.products
     set current_stock = current_stock + p_quantity
   where id = p_product_id;

  if coalesce(p_initial_payment, 0) > 0 then
    insert into public.payments (
      user_id, tenant_id, transaction_type, transaction_id,
      amount, paid_at, method
    ) values (
      v_user_id, p_tenant_id, 'purchase', v_batch_id,
      p_initial_payment, p_purchased_at, 'initial'
    );
  end if;

  return v_batch_id;
end;
$$;

drop function if exists public.record_sale(uuid, integer, numeric, text, timestamptz, uuid);
drop function if exists public.record_sale(uuid, integer, numeric, text, timestamptz, uuid, uuid, numeric, date);

create or replace function public.record_sale(
  p_product_id       uuid,
  p_quantity         integer,
  p_sale_price       numeric,
  p_notes            text,
  p_sold_at          timestamptz,
  p_tenant_id        uuid,
  p_customer_id      uuid    default null,
  p_initial_payment  numeric default null,  -- null = treat as full payment
  p_due_date         date    default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id           uuid := auth.uid();
  v_sale_id           uuid;
  v_remaining         integer := p_quantity;
  v_total_cost        numeric(12,2) := 0;
  v_total_revenue     numeric(12,2) := p_quantity * p_sale_price;
  v_initial_payment   numeric(12,2);
  v_batch             record;
  v_take              integer;
  v_weighted_cost     numeric(12,2);
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- Compute FIFO cost across batches with stock left.
  insert into public.sales (
    user_id, tenant_id, product_id, quantity, sale_price_per_unit,
    cost_price_per_unit, notes, sold_at,
    customer_id, due_date, amount_paid
  )
  values (
    v_user_id, p_tenant_id, p_product_id, p_quantity, p_sale_price,
    0, p_notes, p_sold_at,
    p_customer_id, p_due_date, 0
  )
  returning id into v_sale_id;

  for v_batch in
    select id, quantity_remaining, cost_price
      from public.purchase_batches
     where product_id = p_product_id
       and tenant_id  = p_tenant_id
       and quantity_remaining > 0
     order by purchased_at asc, id asc
     for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_remaining, v_batch.quantity_remaining);

    insert into public.sale_batch_lines (sale_id, purchase_batch_id, quantity_consumed, cost_price)
    values (v_sale_id, v_batch.id, v_take, v_batch.cost_price);

    update public.purchase_batches
       set quantity_remaining = quantity_remaining - v_take
     where id = v_batch.id;

    v_total_cost := v_total_cost + (v_take * v_batch.cost_price);
    v_remaining  := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'insufficient stock for product %', p_product_id;
  end if;

  v_weighted_cost := round(v_total_cost / p_quantity, 2);
  update public.sales
     set cost_price_per_unit = v_weighted_cost
   where id = v_sale_id;

  update public.products
     set current_stock = current_stock - p_quantity
   where id = p_product_id;

  -- Default: NULL initial_payment = fully paid (preserves old call sites).
  v_initial_payment := coalesce(p_initial_payment, v_total_revenue);
  if v_initial_payment > 0 then
    insert into public.payments (
      user_id, tenant_id, transaction_type, transaction_id,
      amount, paid_at, method
    ) values (
      v_user_id, p_tenant_id, 'sale', v_sale_id,
      v_initial_payment, p_sold_at, 'initial'
    );
  end if;

  return v_sale_id;
end;
$$;

-- ─── 7. record_payment ──────────────────────────────────────────────────────

drop function if exists public.record_payment(text, uuid, numeric, timestamptz, text, text, uuid);

create or replace function public.record_payment(
  p_transaction_type text,
  p_transaction_id   uuid,
  p_amount           numeric,
  p_paid_at          timestamptz,
  p_method           text,
  p_note             text,
  p_tenant_id        uuid
) returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id    uuid := auth.uid();
  v_total      numeric(12,2);
  v_paid       numeric(12,2);
  v_payment_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'payment amount must be > 0';
  end if;
  if p_transaction_type not in ('sale','purchase') then
    raise exception 'invalid transaction_type %', p_transaction_type;
  end if;

  if p_transaction_type = 'sale' then
    select total_revenue, amount_paid into v_total, v_paid
      from public.sales where id = p_transaction_id and tenant_id = p_tenant_id;
  else
    select quantity * cost_price, amount_paid into v_total, v_paid
      from public.purchase_batches where id = p_transaction_id and tenant_id = p_tenant_id;
  end if;

  if v_total is null then
    raise exception 'transaction % not found', p_transaction_id;
  end if;
  if v_paid + p_amount > v_total + 0.005 then
    raise exception 'payment exceeds balance due (% remaining)', v_total - v_paid;
  end if;

  insert into public.payments (
    user_id, tenant_id, transaction_type, transaction_id,
    amount, paid_at, method, note
  ) values (
    v_user_id, p_tenant_id, p_transaction_type, p_transaction_id,
    p_amount, coalesce(p_paid_at, now()), p_method, p_note
  )
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

-- ─── 8. Delete guards ───────────────────────────────────────────────────────

drop function if exists public.delete_sale(uuid);
create or replace function public.delete_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id   uuid := auth.uid();
  v_paid      numeric(12,2);
  v_qty       integer;
  v_product   uuid;
  v_line      record;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select amount_paid, quantity, product_id
    into v_paid, v_qty, v_product
    from public.sales
   where id = p_sale_id and user_id = v_user_id;

  if v_product is null then
    raise exception 'sale % not found', p_sale_id;
  end if;
  if v_paid > 0 then
    raise exception 'cannot delete sale with recorded payments; void payments first';
  end if;

  -- Return FIFO units to their batches.
  for v_line in
    select purchase_batch_id, quantity_consumed
      from public.sale_batch_lines
     where sale_id = p_sale_id
  loop
    update public.purchase_batches
       set quantity_remaining = quantity_remaining + v_line.quantity_consumed
     where id = v_line.purchase_batch_id;
  end loop;

  delete from public.sale_batch_lines where sale_id = p_sale_id;
  delete from public.sales where id = p_sale_id;

  update public.products
     set current_stock = current_stock + v_qty
   where id = v_product;
end;
$$;

drop function if exists public.delete_purchase(uuid);
create or replace function public.delete_purchase(p_purchase_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id  uuid := auth.uid();
  v_paid     numeric(12,2);
  v_qty      integer;
  v_remain   integer;
  v_product  uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select amount_paid, quantity, quantity_remaining, product_id
    into v_paid, v_qty, v_remain, v_product
    from public.purchase_batches
   where id = p_purchase_id and user_id = v_user_id;

  if v_product is null then
    raise exception 'purchase % not found', p_purchase_id;
  end if;
  if v_paid > 0 then
    raise exception 'cannot delete purchase with recorded payments; void payments first';
  end if;
  if v_qty <> v_remain then
    raise exception 'cannot delete purchase batch that has been sold from';
  end if;

  delete from public.purchase_batches where id = p_purchase_id;

  update public.products
     set current_stock = current_stock - v_qty
   where id = v_product;
end;
$$;

-- ─── 9. Aggregate / Dues RPCs ────────────────────────────────────────────────

create or replace function public.dues_receivables_summary()
returns table (
  customer_id      uuid,
  name             text,
  phone            text,
  total_due        numeric,
  overdue_amount   numeric,
  oldest_due_date  date,
  transaction_count integer
)
language sql
security definer
as $$
  select
    c.id,
    c.name,
    c.phone,
    sum(s.balance_due)::numeric                                       as total_due,
    sum(case when s.due_date < current_date then s.balance_due else 0 end)::numeric as overdue_amount,
    min(s.due_date)                                                   as oldest_due_date,
    count(*)::int                                                     as transaction_count
  from public.sales s
  join public.customers c on c.id = s.customer_id
  where s.user_id = auth.uid()
    and s.balance_due > 0
  group by c.id, c.name, c.phone
  order by overdue_amount desc, total_due desc;
$$;

create or replace function public.dues_payables_summary()
returns table (
  supplier_id      uuid,
  name             text,
  phone            text,
  total_due        numeric,
  overdue_amount   numeric,
  oldest_due_date  date,
  transaction_count integer
)
language sql
security definer
as $$
  select
    sp.id,
    sp.name,
    sp.phone,
    sum(pb.balance_due)::numeric                                       as total_due,
    sum(case when pb.due_date < current_date then pb.balance_due else 0 end)::numeric as overdue_amount,
    min(pb.due_date)                                                   as oldest_due_date,
    count(*)::int                                                      as transaction_count
  from public.purchase_batches pb
  join public.suppliers sp on sp.id = pb.supplier_id
  where pb.user_id = auth.uid()
    and pb.balance_due > 0
  group by sp.id, sp.name, sp.phone
  order by overdue_amount desc, total_due desc;
$$;

create or replace function public.dues_overdue_count()
returns table (
  receivables_overdue integer,
  payables_overdue    integer
)
language sql
security definer
as $$
  select
    (select count(distinct customer_id)::int
       from public.sales
      where user_id = auth.uid()
        and balance_due > 0
        and due_date is not null
        and due_date < current_date
        and customer_id is not null),
    (select count(distinct supplier_id)::int
       from public.purchase_batches
      where user_id = auth.uid()
        and balance_due > 0
        and due_date is not null
        and due_date < current_date
        and supplier_id is not null);
$$;

create or replace function public.dues_overdue_people(p_limit integer default 10)
returns table (
  kind          text,    -- 'customer' | 'supplier'
  party_id      uuid,
  name          text,
  phone         text,
  overdue_amount numeric,
  oldest_due_date date,
  transaction_count integer
)
language sql
security definer
as $$
  with cust as (
    select 'customer'::text as kind, c.id as party_id, c.name, c.phone,
           sum(s.balance_due)::numeric as overdue_amount,
           min(s.due_date) as oldest_due_date,
           count(*)::int as transaction_count
      from public.sales s
      join public.customers c on c.id = s.customer_id
     where s.user_id = auth.uid()
       and s.balance_due > 0
       and s.due_date is not null
       and s.due_date < current_date
     group by c.id, c.name, c.phone
  ),
  sup as (
    select 'supplier'::text as kind, sp.id as party_id, sp.name, sp.phone,
           sum(pb.balance_due)::numeric as overdue_amount,
           min(pb.due_date) as oldest_due_date,
           count(*)::int as transaction_count
      from public.purchase_batches pb
      join public.suppliers sp on sp.id = pb.supplier_id
     where pb.user_id = auth.uid()
       and pb.balance_due > 0
       and pb.due_date is not null
       and pb.due_date < current_date
     group by sp.id, sp.name, sp.phone
  )
  select * from cust
  union all
  select * from sup
  order by oldest_due_date asc
  limit p_limit;
$$;

-- =============================================================================
-- end migration
-- =============================================================================
