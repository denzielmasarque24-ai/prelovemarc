-- ============================================================
-- PRELOVE SHOP — Payments Table Migration
-- Run in Supabase → SQL Editor
-- ============================================================

-- 1. Create payments table
create table if not exists public.payments (
  id               uuid        primary key default gen_random_uuid(),
  order_id         uuid        not null references public.orders(id) on delete cascade,
  user_id          uuid        references auth.users(id) on delete set null,
  customer_name    text        not null default '',
  payment_method   text        not null default 'cod',
  amount           integer     not null default 0,
  payment_status   text        not null default 'pending',
  proof_of_payment text,
  reference_number text,
  created_at       timestamptz not null default now()
);

-- 2. Add missing columns if table already existed with fewer columns
alter table public.payments add column if not exists user_id          uuid references auth.users(id) on delete set null;
alter table public.payments add column if not exists customer_name    text not null default '';
alter table public.payments add column if not exists proof_of_payment text;
alter table public.payments add column if not exists reference_number text;

-- 3. Disable RLS for development
alter table public.payments disable row level security;

-- 4. Backfill: insert a payment row for every order that has no payment record yet
insert into public.payments (
  id,
  order_id,
  user_id,
  customer_name,
  payment_method,
  amount,
  payment_status,
  proof_of_payment,
  reference_number,
  created_at
)
select
  gen_random_uuid(),
  o.id,
  o.user_id,
  o.customer_name,
  o.payment_method,
  o.total,
  case
    when lower(o.status) in ('completed', 'delivered') then 'completed'
    when lower(o.status) = 'cancelled'                 then 'cancelled'
    else 'pending'
  end,
  o.payment_proof,
  o.reference_number,
  o.created_at
from public.orders o
where not exists (
  select 1 from public.payments p where p.order_id = o.id
);

-- 5. Reload schema cache
notify pgrst, 'reload schema';

-- 6. Verify
select
  p.id,
  p.order_id,
  p.customer_name,
  p.payment_method,
  p.amount,
  p.payment_status,
  p.created_at
from public.payments p
order by p.created_at desc
limit 20;
