-- ============================================================
-- PRELOVE SHOP - Checkout Profile Address Fields
-- Run in Supabase SQL Editor if your profiles table already exists.
-- ============================================================

alter table public.profiles add column if not exists barangay text not null default '';
alter table public.profiles add column if not exists city text not null default '';
alter table public.profiles add column if not exists province text not null default '';
alter table public.profiles add column if not exists zip_code text not null default '';

update public.profiles
set
  barangay = coalesce(barangay, ''),
  city = coalesce(city, ''),
  province = coalesce(province, ''),
  zip_code = coalesce(zip_code, '');

notify pgrst, 'reload schema';
