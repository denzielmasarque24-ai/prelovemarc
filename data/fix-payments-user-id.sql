-- ============================================================
-- PRELOVE SHOP - Fix payments.user_id schema cache error
-- Run this in Supabase SQL Editor.
-- Safe to run more than once.
-- ============================================================

create extension if not exists "pgcrypto";

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

alter table public.payments add column if not exists user_id uuid;

update public.payments p
set user_id = o.user_id
from public.orders o
where p.order_id = o.id
  and p.user_id is null
  and o.user_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_user_id_fkey'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete set null
      not valid;
  end if;
end $$;

alter table public.payments validate constraint payments_user_id_fkey;

create index if not exists payments_user_id_idx on public.payments(user_id);

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
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Customers can read own payments" on public.payments;
create policy "Customers can read own payments"
on public.payments
for select
to authenticated
using (user_id = auth.uid());

notify pgrst, 'reload schema';
