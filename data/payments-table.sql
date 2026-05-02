-- ============================================================
-- PRELOVE SHOP - Payments table for checkout and admin revenue
-- Run this in Supabase SQL Editor.
-- Safe to run more than once.
-- ============================================================

create extension if not exists "pgcrypto";

alter table public.orders add column if not exists total_price integer;
alter table public.orders add column if not exists payment_status text not null default 'pending';

update public.orders
set total_price = coalesce(total_price, total)
where total_price is null;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null default '',
  payment_method text not null default 'cod',
  amount integer not null default 0 check (amount >= 0),
  payment_status text not null default 'pending',
  proof_of_payment text,
  reference_number text,
  created_at timestamptz not null default now()
);

create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_payment_status_idx on public.payments(payment_status);

insert into public.payments (
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
  o.id,
  o.user_id,
  coalesce(o.customer_name, ''),
  coalesce(o.payment_method, 'cod'),
  coalesce(o.total_price, o.total, 0),
  coalesce(nullif(o.payment_status, ''), case when o.payment_method = 'cod' then 'pending' else 'completed' end),
  o.payment_proof,
  o.reference_number,
  coalesce(o.created_at, now())
from public.orders o
where not exists (
  select 1
  from public.payments p
  where p.order_id = o.id
);

alter table public.payments enable row level security;

drop policy if exists "Admins can read all payments" on public.payments;
create policy "Admins can read all payments"
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "Customers can create own payments" on public.payments;
create policy "Customers can create own payments"
on public.payments
for insert
to anon, authenticated
with check (user_id is null or user_id = auth.uid());

drop policy if exists "Customers can read own payments" on public.payments;
create policy "Customers can read own payments"
on public.payments
for select
to authenticated
using (user_id = auth.uid());

notify pgrst, 'reload schema';
