-- ============================================================
-- PRELOVE SHOP - Requested 10 Products With Complete Descriptions
-- Run this in Supabase SQL Editor.
-- Safe to run more than once.
-- ============================================================

alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists image text;
alter table public.products add column if not exists category text not null default 'tops';
alter table public.products add column if not exists description text default '';
alter table public.products add column if not exists stock integer default 0;
alter table public.products add column if not exists status text not null default 'active';

with desired_products (
  name,
  legacy_name,
  price,
  image_url,
  category,
  description,
  stock
) as (
  values
    (
      'Highwaist Shorts',
      'Soft Blush Shorts',
      1299,
      '/images/short1.png',
      'bottoms',
      E'• Size: 24-25\n• Condition: 10/10\n• Worn twice\n• Fit: flattering high-waist cut, comfy and stylish',
      10
    ),
    (
      'Twist Front Tube Top',
      null,
      999,
      '/images/twist-front-tube-top.png',
      'tops',
      E'• Brand: SHEIN\n• Size: XS-Small\n• Condition: 10/10\n• Worn once\n• Style: trendy twist-front design, perfect for casual outfits',
      10
    ),
    (
      'Blue Top',
      null,
      1499,
      '/images/blue-top.png',
      'tops',
      E'• Brand: Divided\n• Size: Small\n• Condition: 10/10\n• Worn once\n• Style: simple and versatile, easy to match',
      10
    ),
    (
      'Self-Tie Top',
      'Self-tie Top',
      1699,
      '/images/self-tie-top.png',
      'tops',
      E'• Size: Small-Medium\n• Condition: 10/10\n• Worn twice\n• Style: adjustable self-tie design',
      10
    ),
    (
      'One Shoulder Rib-Knot Top',
      null,
      2199,
      '/images/one-shoulder-rib-knot-top.png',
      'tops',
      E'• Brand: SHEIN\n• Size: Small\n• Condition: 10/10\n• Worn once\n• Style: chic one-shoulder ribbed look',
      10
    ),
    (
      'Drawstring Ruched Top',
      'One Drawstring Ruched Top',
      2399,
      '/images/one-drawstring-ruched-top.png',
      'tops',
      E'• Brand: SHEIN\n• Size: Small\n• Condition: 10/10\n• Worn once\n• Style: ruched adjustable fit',
      10
    ),
    (
      'Lace Top',
      null,
      1199,
      '/images/lace-top.png',
      'tops',
      E'• Brand: SHEIN\n• Size: XS\n• Condition: 10/10\n• Style: delicate lace, feminine look',
      10
    ),
    (
      'Fendi Highwaist Shorts',
      null,
      1399,
      '/images/fendi-highwaist-shorts.png',
      'bottoms',
      E'• Brand: FENDI\n• Size: 26\n• Condition: Brand New\n• Style: premium designer high-waist fit',
      10
    ),
    (
      'Lightwash Highwaist Shorts',
      null,
      1599,
      '/images/lightwash-highwaist-shorts.png',
      'bottoms',
      E'• Size: 26\n• Condition: 10/10\n• Style: light denim everyday wear',
      10
    ),
    (
      'Tie Shoulder Hem Tank Top',
      'Shoulder Hem Tank Top',
      1299,
      '/images/shoulder-hem-tank-top.png',
      'tops',
      E'• Brand: SHEIN\n• Size: Small\n• Condition: 10/10\n• Style: tie-shoulder adjustable fit',
      10
    )
)
update public.products p
set
  name = d.name,
  price = d.price,
  image = d.image_url,
  image_url = d.image_url,
  category = d.category,
  description = d.description,
  stock = greatest(coalesce(p.stock, d.stock), 0),
  status = 'active'
from desired_products d
where lower(p.name) = lower(d.name)
   or (d.legacy_name is not null and lower(p.name) = lower(d.legacy_name));

with desired_products (
  name,
  legacy_name,
  price,
  image_url,
  category,
  description,
  stock
) as (
  values
    ('Highwaist Shorts', 'Soft Blush Shorts', 1299, '/images/short1.png', 'bottoms', E'• Size: 24-25\n• Condition: 10/10\n• Worn twice\n• Fit: flattering high-waist cut, comfy and stylish', 10),
    ('Twist Front Tube Top', null, 999, '/images/twist-front-tube-top.png', 'tops', E'• Brand: SHEIN\n• Size: XS-Small\n• Condition: 10/10\n• Worn once\n• Style: trendy twist-front design, perfect for casual outfits', 10),
    ('Blue Top', null, 1499, '/images/blue-top.png', 'tops', E'• Brand: Divided\n• Size: Small\n• Condition: 10/10\n• Worn once\n• Style: simple and versatile, easy to match', 10),
    ('Self-Tie Top', 'Self-tie Top', 1699, '/images/self-tie-top.png', 'tops', E'• Size: Small-Medium\n• Condition: 10/10\n• Worn twice\n• Style: adjustable self-tie design', 10),
    ('One Shoulder Rib-Knot Top', null, 2199, '/images/one-shoulder-rib-knot-top.png', 'tops', E'• Brand: SHEIN\n• Size: Small\n• Condition: 10/10\n• Worn once\n• Style: chic one-shoulder ribbed look', 10),
    ('Drawstring Ruched Top', 'One Drawstring Ruched Top', 2399, '/images/one-drawstring-ruched-top.png', 'tops', E'• Brand: SHEIN\n• Size: Small\n• Condition: 10/10\n• Worn once\n• Style: ruched adjustable fit', 10),
    ('Lace Top', null, 1199, '/images/lace-top.png', 'tops', E'• Brand: SHEIN\n• Size: XS\n• Condition: 10/10\n• Style: delicate lace, feminine look', 10),
    ('Fendi Highwaist Shorts', null, 1399, '/images/fendi-highwaist-shorts.png', 'bottoms', E'• Brand: FENDI\n• Size: 26\n• Condition: Brand New\n• Style: premium designer high-waist fit', 10),
    ('Lightwash Highwaist Shorts', null, 1599, '/images/lightwash-highwaist-shorts.png', 'bottoms', E'• Size: 26\n• Condition: 10/10\n• Style: light denim everyday wear', 10),
    ('Tie Shoulder Hem Tank Top', 'Shoulder Hem Tank Top', 1299, '/images/shoulder-hem-tank-top.png', 'tops', E'• Brand: SHEIN\n• Size: Small\n• Condition: 10/10\n• Style: tie-shoulder adjustable fit', 10)
)
insert into public.products (name, price, image, image_url, category, description, stock, status)
select d.name, d.price, d.image_url, d.image_url, d.category, d.description, d.stock, 'active'
from desired_products d
where not exists (
  select 1
  from public.products p
  where lower(p.name) = lower(d.name)
     or (d.legacy_name is not null and lower(p.name) = lower(d.legacy_name))
);

notify pgrst, 'reload schema';
