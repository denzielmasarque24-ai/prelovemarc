-- ============================================================
-- PRELOVE SHOP - Fix Missing orders.stock_deducted Column
-- Run this in the Supabase SQL Editor.
-- ============================================================

alter table public.orders
  add column if not exists stock_deducted boolean not null default false;

update public.orders
set stock_deducted = false
where stock_deducted is null;

create index if not exists orders_stock_deducted_idx
on public.orders(stock_deducted);

notify pgrst, 'reload schema';

select
  column_name,
  data_type,
  column_default,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'orders'
  and column_name = 'stock_deducted';
