-- ============================================================
-- PRELOVE SHOP - Complete Database Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ===== EXTENSIONS =====
create extension if not exists "pgcrypto";

-- ===== USERS TABLE =====
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default 'User',
  email text,
  address text default '',
  username text default '',
  phone text default '',
  avatar text default '',
  role text default 'user',
  created_at timestamptz not null default now()
);

alter table public.users add column if not exists full_name text default 'User';
alter table public.users add column if not exists email text;
alter table public.users add column if not exists address text default '';
alter table public.users add column if not exists username text default '';
alter table public.users add column if not exists phone text default '';
alter table public.users add column if not exists avatar text default '';
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists created_at timestamptz not null default now();

-- ===== PRODUCTS TABLE =====
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price integer not null check (price >= 0),
  image text not null default '',
  category text not null default 'Tops',
  description text default '',
  size text default '',
  color text default '',
  stock integer default 0,
  status text default 'active',
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists size text default '';
alter table public.products add column if not exists color text default '';
alter table public.products add column if not exists stock integer default 0;
alter table public.products add column if not exists status text default 'active';

-- ===== ORDERS TABLE =====
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  address text not null,
  barangay text,
  city text,
  province text,
  zip_code text,
  notes text,
  payment_method text not null,
  delivery_option text not null default 'pickup',
  total integer not null check (total >= 0),
  status text not null default 'pending',
  reference_number text,
  payment_proof text,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists barangay text;
alter table public.orders add column if not exists city text;
alter table public.orders add column if not exists province text;
alter table public.orders add column if not exists zip_code text;
alter table public.orders add column if not exists delivery_option text not null default 'pickup';
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists reference_number text;
alter table public.orders add column if not exists payment_proof text;

-- ===== ORDER ITEMS TABLE =====
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_name text not null,
  price integer not null check (price >= 0),
  quantity integer not null check (quantity > 0)
);

-- ===== CART ITEMS TABLE =====
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ===== CONTACT MESSAGES TABLE =====
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ===== DISABLE RLS FOR DEVELOPMENT =====
alter table public.users disable row level security;
alter table public.products disable row level security;
alter table public.orders disable row level security;
alter table public.order_items disable row level security;
alter table public.cart_items disable row level security;
alter table public.contact_messages disable row level security;

-- ===== RELOAD SCHEMA =====
notify pgrst, 'reload schema';

-- ===== CREATE ADMIN ACCOUNT =====
-- After running this migration, create the admin user in Supabase Auth Dashboard:
--   Email: admin@gmail.com
--   Password: admin123
-- Then run this to set the admin role (replace <USER_UUID> with the actual UUID):
--
-- insert into public.users (id, email, full_name, role)
-- values ('<USER_UUID>', 'admin@gmail.com', 'Admin', 'admin')
-- on conflict (id) do update set role = 'admin';
--
-- OR update an existing user:
-- update public.users set role = 'admin' where email = 'admin@gmail.com';
