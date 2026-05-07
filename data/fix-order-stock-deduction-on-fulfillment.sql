-- ============================================================
-- PRELOVE SHOP - Deduct Stock When Order Is Completed/Delivered
-- Run this in the Supabase SQL Editor, then refresh the app.
-- ============================================================

alter table public.orders
  add column if not exists stock_deducted boolean not null default false;

alter table public.order_items
  add column if not exists product_id uuid references public.products(id) on delete set null;

-- Backfill product_id for older order items when the saved product name still
-- matches a product row. New checkout orders save product_id directly.
update public.order_items oi
set product_id = p.id
from public.products p
where oi.product_id is null
  and lower(trim(oi.product_name)) = lower(trim(p.name));

-- Allow Delivered as its own fulfilled status where a status CHECK exists.
update public.orders
set status = case
  when lower(trim(status)) in ('pending') then 'pending'
  when lower(trim(status)) in ('in_progress', 'in progress', 'processing', 'preparing', 'shipping', 'confirmed', 'out_for_delivery', 'out for delivery') then 'in_progress'
  when lower(trim(status)) in ('completed', 'complete', 'paid') then 'completed'
  when lower(trim(status)) in ('delivered') then 'delivered'
  when lower(trim(status)) in ('cancelled', 'canceled') then 'cancelled'
  else 'pending'
end
where status is not null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.orders drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'in_progress', 'completed', 'delivered', 'cancelled'));

create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists orders_stock_deducted_idx on public.orders(stock_deducted);

create or replace function public.deduct_order_stock_on_fulfillment(
  target_order_id uuid,
  next_order_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  item_row record;
  product_row public.products%rowtype;
  deduction_rows jsonb := '[]'::jsonb;
begin
  if next_order_status not in ('completed', 'delivered') then
    update public.orders
    set status = next_order_status
    where id = target_order_id;

    return jsonb_build_object(
      'order_id', target_order_id,
      'status', next_order_status,
      'stock_deducted', false,
      'deductions', deduction_rows
    );
  end if;

  select *
  into order_row
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'Order % not found.', target_order_id;
  end if;

  if order_row.stock_deducted then
    update public.orders
    set status = next_order_status
    where id = target_order_id;

    return jsonb_build_object(
      'order_id', target_order_id,
      'status', next_order_status,
      'stock_deducted', true,
      'deductions', deduction_rows
    );
  end if;

  for item_row in
    select
      oi.product_id,
      max(oi.product_name) as product_name,
      sum(oi.quantity)::integer as ordered_quantity
    from public.order_items oi
    where oi.order_id = target_order_id
    group by oi.product_id
  loop
    if item_row.product_id is null then
      raise exception 'Order item "%" is missing product_id, so stock cannot be deducted safely.', item_row.product_name;
    end if;

    select *
    into product_row
    from public.products
    where id = item_row.product_id
    for update;

    if not found then
      raise exception 'Product "%" is no longer available.', item_row.product_name;
    end if;

    if item_row.ordered_quantity > product_row.stock then
      raise exception 'Only % % left in stock. Stock was not deducted.',
        product_row.stock,
        product_row.name;
    end if;

    update public.products
    set stock = product_row.stock - item_row.ordered_quantity
    where id = item_row.product_id;

    deduction_rows := deduction_rows || jsonb_build_array(
      jsonb_build_object(
        'product_id', item_row.product_id,
        'product_name', product_row.name,
        'current_stock', product_row.stock,
        'ordered_quantity', item_row.ordered_quantity,
        'new_stock', product_row.stock - item_row.ordered_quantity
      )
    );
  end loop;

  if deduction_rows = '[]'::jsonb then
    raise exception 'This order has no items to deduct from stock.';
  end if;

  update public.orders
  set
    status = next_order_status,
    stock_deducted = true
  where id = target_order_id;

  return jsonb_build_object(
    'order_id', target_order_id,
    'status', next_order_status,
    'stock_deducted', true,
    'deductions', deduction_rows
  );
end;
$$;

notify pgrst, 'reload schema';

select
  'orders.stock_deducted, order_items.product_id, and fulfilled-order stock deduction RPC are ready' as result;
