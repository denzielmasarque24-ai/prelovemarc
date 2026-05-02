-- ============================================================
-- PRELOVE SHOP - Fix orders.status CHECK constraint
-- Run this in Supabase SQL Editor.
-- Safe for existing data: old status values are normalized first.
-- ============================================================

-- See the current status check constraint(s).
select
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
from pg_constraint
where conrelid = 'public.orders'::regclass
  and contype = 'c'
  and pg_get_constraintdef(oid) ilike '%status%';

-- Normalize existing rows before applying the stricter allowed set.
update public.orders
set status = case
  when lower(trim(status)) in ('pending') then 'pending'
  when lower(trim(status)) in ('in_progress', 'in progress', 'confirmed', 'preparing', 'out_for_delivery', 'out for delivery') then 'in_progress'
  when lower(trim(status)) in ('completed', 'complete', 'paid', 'delivered') then 'completed'
  when lower(trim(status)) in ('cancelled', 'canceled') then 'cancelled'
  else 'pending'
end;

-- Drop any existing CHECK constraints on orders.status.
do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.orders drop constraint if exists %I', constraint_record.conname);
  end loop;
end $$;

-- Add the correct production constraint.
alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'in_progress', 'completed', 'cancelled'));

alter table public.orders
  alter column status set default 'pending';

notify pgrst, 'reload schema';
