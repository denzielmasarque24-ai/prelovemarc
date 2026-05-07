-- ============================================================
-- PRELOVE SHOP - Fix payments.proof_of_payment schema cache error
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

alter table public.payments add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.payments add column if not exists customer_name text not null default '';
alter table public.payments add column if not exists payment_method text not null default 'cod';
alter table public.payments add column if not exists amount integer not null default 0;
alter table public.payments add column if not exists payment_status text not null default 'pending';
alter table public.payments add column if not exists proof_of_payment text;
alter table public.payments add column if not exists reference_number text;
alter table public.payments add column if not exists created_at timestamptz not null default now();

update public.payments p
set proof_of_payment = o.payment_proof
from public.orders o
where p.order_id = o.id
  and (p.proof_of_payment is null or p.proof_of_payment = '')
  and o.payment_proof is not null
  and o.payment_proof <> '';

create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_payment_status_idx on public.payments(payment_status);

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can view payment proofs" on storage.objects;
create policy "Anyone can view payment proofs"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'payment-proofs');

drop policy if exists "Customers can upload payment proofs" on storage.objects;
create policy "Customers can upload payment proofs"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'payment-proofs');

notify pgrst, 'reload schema';
