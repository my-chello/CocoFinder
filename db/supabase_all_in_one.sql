-- CocoFinder Supabase all-in-one setup
-- Run this whole file in Supabase SQL Editor.

-- Profiles
create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    email text,
    role text not null check (role in ('customer', 'vendor')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists profile_photo_url text;

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Notification preferences
create table if not exists public.notification_preferences (
    user_id uuid primary key references auth.users (id) on delete cascade,
    message_notifications boolean not null default true,
    vendor_updates boolean not null default true,
    marketing_notifications boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users can view their own notification preferences" on public.notification_preferences;
drop policy if exists "Users can insert their own notification preferences" on public.notification_preferences;
drop policy if exists "Users can update their own notification preferences" on public.notification_preferences;

create policy "Users can view their own notification preferences"
on public.notification_preferences
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own notification preferences"
on public.notification_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own notification preferences"
on public.notification_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Push tokens
create table if not exists public.push_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    expo_push_token text not null unique,
    platform text,
    device_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_push_tokens_user_id on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

drop policy if exists "Users can view their own push tokens" on public.push_tokens;
drop policy if exists "Users can insert their own push tokens" on public.push_tokens;
drop policy if exists "Users can update their own push tokens" on public.push_tokens;
drop policy if exists "Users can delete their own push tokens" on public.push_tokens;

create policy "Users can view their own push tokens"
on public.push_tokens
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own push tokens"
on public.push_tokens
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own push tokens"
on public.push_tokens
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own push tokens"
on public.push_tokens
for delete
to authenticated
using (auth.uid() = user_id);

-- Vendor profiles and products
create table if not exists public.vendor_profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    email text,
    first_name text,
    last_name text,
    business_name text,
    logo_symbol text,
    category text,
    country text,
    phone text,
    opening_hours text,
    about text,
    is_live boolean not null default false,
    live_latitude double precision,
    live_longitude double precision,
    live_updated_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.vendor_profiles add column if not exists email text;

create table if not exists public.vendor_products (
    id text primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    name text not null,
    price_label text not null,
    is_available boolean not null default true,
    image_symbol text,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_vendor_products_user_id on public.vendor_products(user_id);
create index if not exists idx_vendor_products_sort_order on public.vendor_products(user_id, sort_order);
create index if not exists idx_vendor_profiles_email on public.vendor_profiles(email);

alter table public.vendor_profiles enable row level security;
alter table public.vendor_products enable row level security;

drop policy if exists "Users can view their own vendor profile" on public.vendor_profiles;
drop policy if exists "Authenticated users can view vendor discovery profiles" on public.vendor_profiles;
drop policy if exists "Users can insert their own vendor profile" on public.vendor_profiles;
drop policy if exists "Users can update their own vendor profile" on public.vendor_profiles;
drop policy if exists "Users can delete their own vendor profile" on public.vendor_profiles;

create policy "Users can view their own vendor profile"
on public.vendor_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Authenticated users can view vendor discovery profiles"
on public.vendor_profiles
for select
to authenticated
using (business_name is not null);

create policy "Users can insert their own vendor profile"
on public.vendor_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own vendor profile"
on public.vendor_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own vendor profile"
on public.vendor_profiles
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view their own vendor products" on public.vendor_products;
drop policy if exists "Authenticated users can view vendor discovery products" on public.vendor_products;
drop policy if exists "Users can insert their own vendor products" on public.vendor_products;
drop policy if exists "Users can update their own vendor products" on public.vendor_products;
drop policy if exists "Users can delete their own vendor products" on public.vendor_products;

create policy "Users can view their own vendor products"
on public.vendor_products
for select
to authenticated
using (auth.uid() = user_id);

create policy "Authenticated users can view vendor discovery products"
on public.vendor_products
for select
to authenticated
using (true);

create policy "Users can insert their own vendor products"
on public.vendor_products
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own vendor products"
on public.vendor_products
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own vendor products"
on public.vendor_products
for delete
to authenticated
using (auth.uid() = user_id);

-- Favorites and messages
create table if not exists public.app_favorites (
    user_id uuid not null references auth.users (id) on delete cascade,
    vendor_id text not null,
    created_at timestamptz not null default now(),
    primary key (user_id, vendor_id)
);

create table if not exists public.app_conversations (
    id text primary key,
    customer_user_id uuid not null references auth.users (id) on delete cascade,
    vendor_user_id uuid references auth.users (id) on delete cascade,
    vendor_id text not null,
    customer_deleted boolean not null default false,
    vendor_deleted boolean not null default false,
    customer_unread_count integer not null default 0,
    vendor_unread_count integer not null default 0,
    last_message_preview text not null default '',
    last_message_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.app_conversations add column if not exists vendor_user_id uuid references auth.users (id) on delete cascade;
alter table public.app_conversations add column if not exists vendor_deleted boolean not null default false;
alter table public.app_conversations add column if not exists vendor_unread_count integer not null default 0;

update public.app_conversations
set vendor_user_id = replace(vendor_id, 'supabase-vendor-', '')::uuid
where vendor_user_id is null
  and vendor_id ~ '^supabase-vendor-[0-9a-fA-F-]{36}$';

create table if not exists public.app_messages (
    id text primary key,
    conversation_id text not null references public.app_conversations (id) on delete cascade,
    sender_role text not null check (sender_role in ('customer', 'vendor')),
    sender_name text not null,
    body text not null,
    sent_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_app_conversations_customer on public.app_conversations(customer_user_id, updated_at desc);
create index if not exists idx_app_messages_conversation on public.app_messages(conversation_id, sent_at asc);

alter table public.app_favorites enable row level security;
alter table public.app_conversations enable row level security;
alter table public.app_messages enable row level security;

drop policy if exists "Users can view their own favorites" on public.app_favorites;
drop policy if exists "Users can manage their own favorites" on public.app_favorites;

create policy "Users can view their own favorites"
on public.app_favorites
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can manage their own favorites"
on public.app_favorites
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Customers can view their own conversations" on public.app_conversations;
drop policy if exists "Customers can manage their own conversations" on public.app_conversations;
drop policy if exists "Vendors can view their own conversations" on public.app_conversations;
drop policy if exists "Vendors can manage their own conversations" on public.app_conversations;

create policy "Customers can view their own conversations"
on public.app_conversations
for select
to authenticated
using (auth.uid() = customer_user_id);

create policy "Customers can manage their own conversations"
on public.app_conversations
for all
to authenticated
using (auth.uid() = customer_user_id)
with check (auth.uid() = customer_user_id);

create policy "Vendors can view their own conversations"
on public.app_conversations
for select
to authenticated
using (auth.uid() = vendor_user_id);

create policy "Vendors can manage their own conversations"
on public.app_conversations
for all
to authenticated
using (auth.uid() = vendor_user_id)
with check (auth.uid() = vendor_user_id);

drop policy if exists "Customers can view messages in their conversations" on public.app_messages;
drop policy if exists "Customers can insert messages in their conversations" on public.app_messages;
drop policy if exists "Vendors can view messages in their conversations" on public.app_messages;
drop policy if exists "Vendors can insert messages in their conversations" on public.app_messages;

create policy "Customers can view messages in their conversations"
on public.app_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.app_conversations c
    where c.id = conversation_id
      and c.customer_user_id = auth.uid()
  )
);

create policy "Customers can insert messages in their conversations"
on public.app_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.app_conversations c
    where c.id = conversation_id
      and c.customer_user_id = auth.uid()
  )
);

create policy "Vendors can view messages in their conversations"
on public.app_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.app_conversations c
    where c.id = conversation_id
      and c.vendor_user_id = auth.uid()
  )
);

create policy "Vendors can insert messages in their conversations"
on public.app_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.app_conversations c
    where c.id = conversation_id
      and c.vendor_user_id = auth.uid()
  )
);

-- Demo vendor discovery data
create table if not exists public.demo_vendor_profiles (
    id text primary key,
    owner_name text,
    business_name text not null,
    logo_symbol text,
    category text not null,
    country text not null default 'Netherlands',
    phone text,
    opening_hours text,
    about text,
    is_live boolean not null default false,
    live_latitude double precision,
    live_longitude double precision,
    live_updated_at timestamptz,
    rating numeric(2,1) not null default 4.8,
    price_hint text,
    next_area text,
    tags text[] not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.demo_vendor_products (
    id text primary key,
    vendor_id text not null references public.demo_vendor_profiles (id) on delete cascade,
    name text not null,
    price_label text not null,
    is_available boolean not null default true,
    image_symbol text,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_demo_vendor_products_vendor_id on public.demo_vendor_products(vendor_id);
create index if not exists idx_demo_vendor_products_sort_order on public.demo_vendor_products(vendor_id, sort_order);

alter table public.demo_vendor_profiles enable row level security;
alter table public.demo_vendor_products enable row level security;

drop policy if exists "Authenticated users can view demo vendor profiles" on public.demo_vendor_profiles;
drop policy if exists "Authenticated users can view demo vendor products" on public.demo_vendor_products;

create policy "Authenticated users can view demo vendor profiles"
on public.demo_vendor_profiles
for select
to authenticated
using (true);

create policy "Authenticated users can view demo vendor products"
on public.demo_vendor_products
for select
to authenticated
using (true);

insert into public.demo_vendor_profiles (
    id, owner_name, business_name, logo_symbol, category, country, phone, opening_hours, about,
    is_live, live_latitude, live_longitude, live_updated_at, rating, price_hint, next_area, tags, updated_at
)
values
    (
        'vendor-roast-route', 'Mila Roast', 'Roast Route', '☕', 'Coffee Cart', 'Netherlands',
        '+31 20 555 1010', 'Mon-Fri · 07:00-14:00',
        'Small-batch espresso and warm pastries served from a bright yellow cart near busy office blocks.',
        false, 52.3759, 5.2195, now() - interval '2 minute', 4.9, 'EUR 3-8', 'Almere Centrum',
        array['Latte','Croissant','Morning Rush','Almere Centrum'],
        now()
    ),
    (
        'vendor-north-market', 'Jonas Market', 'North Market Van', '🥕', 'Fresh Produce', 'Netherlands',
        '+31 20 555 2020', 'Tue-Sat · 09:00-17:00',
        'Seasonal fruit, vegetables, and pantry staples with route updates for neighborhood square stops.',
        true, 52.3744, 5.2242, now() - interval '5 minute', 4.7, 'EUR 2-16', 'Marktmeesterstraat, Almere',
        array['Local','Organic','Daily Route','Market'],
        now()
    ),
    (
        'vendor-cocero', 'Maya Cocero', 'Cocero', '🥥', 'Coconut', 'Netherlands',
        '+31 20 555 6060', 'Daily · 10:00-18:00',
        'Fresh chilled coconut water and tropical fruit cups served from a bright mobile stand near the park.',
        true, 52.3714, 5.2181, now() - interval '1 minute', 4.9, 'EUR 4-8', 'Muzenpark, Almere',
        array['Coconut Water','Fresh Fruit','Tropical'],
        now()
    ),
    (
        'vendor-sweet-wheel', 'Nina Sweet', 'Sweet Wheel', '🍨', 'Dessert Van', 'Netherlands',
        '+31 20 555 5050', 'Daily · 11:00-21:00',
        'Fresh stroopwafels, mini pancakes, and soft-serve specials from a small dessert van parked nearby.',
        false, 52.3699, 5.2158, now() - interval '2 minute', 4.9, 'EUR 4-9', 'Esplanade, Almere',
        array['Stroopwafel','Mini Pancakes','Dessert','Almere'],
        now()
    ),
    (
        'vendor-truck-i-pan-almere', 'Ravi Pan', 'Truck I Pan Almere', '🍖', 'BBQ Truck', 'Netherlands',
        '+31 36 555 7070', 'Thu-Sun · 12:00-21:00',
        'Smoky BBQ sandwiches, grilled ribs, and loaded street plates served hot from a black food truck in Almere.',
        true, 52.36788, 5.19047, now() - interval '3 minute', 4.8, 'EUR 7-16', 'Michael Jacksonplein 1, 1323 PZ Almere',
        array['BBQ','Ribs','Street Food'],
        now()
    ),
    (
        'vendor-stroopwafel-kar', 'Sanne Wafel', 'De Stroopwafel Kar', '🧇', 'Dutch Snacks', 'Netherlands',
        '+31 36 555 8080', 'Daily · 11:00-19:00',
        'Fresh Dutch stroopwafels baked on the spot from a cozy cart near Almere Centrum.',
        true, 52.3753, 5.2199, now() - interval '1 minute', 4.9, 'EUR 3-7', 'Almere Centrum',
        array['Dutch Snacks','Stroopwafel','Sweet'],
        now()
    ),
    (
        'vendor-friet-van-pansen', 'Piet Pansen', 'Friet van Pansen', '🍟', 'Dutch Snacks', 'Netherlands',
        '+31 36 555 8181', 'Wed-Sun · 12:00-21:00',
        'Artisan Dutch fries with bold sauces and crunchy toppings served fresh in Almere Stad.',
        true, 52.3732, 5.2218, now() - interval '2 minute', 4.8, 'EUR 4-10', 'Almere Stad',
        array['Dutch Snacks','Fries','Street Food'],
        now()
    ),
    (
        'vendor-haring-henk', 'Henk Visser', 'Haring Henk', '🐟', 'Dutch Snacks', 'Netherlands',
        '+31 36 555 8282', 'Tue-Sat · 10:00-18:00',
        'Traditional herring cart with onions, pickles, and Dutch seafood classics near the Weerwater.',
        true, 52.3688, 5.2274, now() - interval '4 minute', 4.7, 'EUR 4-9', 'Weerwater, Almere',
        array['Dutch Snacks','Herring','Seafood'],
        now()
    )
on conflict (id) do update set
    owner_name = excluded.owner_name,
    business_name = excluded.business_name,
    logo_symbol = excluded.logo_symbol,
    category = excluded.category,
    country = excluded.country,
    phone = excluded.phone,
    opening_hours = excluded.opening_hours,
    about = excluded.about,
    is_live = excluded.is_live,
    live_latitude = excluded.live_latitude,
    live_longitude = excluded.live_longitude,
    live_updated_at = excluded.live_updated_at,
    rating = excluded.rating,
    price_hint = excluded.price_hint,
    next_area = excluded.next_area,
    tags = excluded.tags,
    updated_at = excluded.updated_at;

insert into public.demo_vendor_products (
    id, vendor_id, name, price_label, is_available, image_symbol, sort_order, updated_at
)
values
    ('product-latte', 'vendor-roast-route', 'Oat Latte', 'EUR 4.50', true, '☕', 0, now()),
    ('product-flat-white', 'vendor-roast-route', 'Flat White', 'EUR 4.20', true, '☕', 1, now()),
    ('product-pain-au-choc', 'vendor-roast-route', 'Pain au Chocolat', 'EUR 3.80', true, '🥐', 2, now()),
    ('product-berries', 'vendor-north-market', 'Fresh Berry Box', 'EUR 5.20', true, '🫐', 0, now()),
    ('product-veg-bag', 'vendor-north-market', 'Mixed Veg Bag', 'EUR 8.50', true, '🥬', 1, now()),
    ('product-apples', 'vendor-north-market', 'Dutch Apples', 'EUR 3.90', true, '🍎', 2, now()),
    ('product-coconut-water', 'vendor-cocero', 'Fresh Coconut Water', 'EUR 5.50', true, '🥥', 0, now()),
    ('product-coconut-lime', 'vendor-cocero', 'Coconut Lime Splash', 'EUR 6.20', true, '🥥', 1, now()),
    ('product-fruit-cup', 'vendor-cocero', 'Tropical Fruit Cup', 'EUR 7.40', true, '🍍', 2, now()),
    ('product-stroopwafel', 'vendor-sweet-wheel', 'Fresh Stroopwafel', 'EUR 4.50', true, '🧇', 0, now()),
    ('product-mini-pancakes', 'vendor-sweet-wheel', 'Mini Pancakes', 'EUR 7.40', true, '🥞', 1, now()),
    ('product-soft-serve', 'vendor-sweet-wheel', 'Vanilla Soft Serve', 'EUR 5.10', true, '🍦', 2, now()),
    ('product-truck-i-pan-ribs', 'vendor-truck-i-pan-almere', 'Sticky BBQ Ribs', 'EUR 15.50', true, '🍖', 0, now()),
    ('product-truck-i-pan-brisket', 'vendor-truck-i-pan-almere', 'Smoked Brisket Roll', 'EUR 11.80', true, '🍖', 1, now()),
    ('product-truck-i-pan-wings', 'vendor-truck-i-pan-almere', 'Fire Glazed Wings', 'EUR 9.60', true, '🍗', 2, now()),
    ('product-stroopwafel-classic', 'vendor-stroopwafel-kar', 'Classic Stroopwafel', 'EUR 4.20', true, '🧇', 0, now()),
    ('product-stroopwafel-choco', 'vendor-stroopwafel-kar', 'Chocolate Stroopwafel', 'EUR 5.10', true, '🧇', 1, now()),
    ('product-friet-classic', 'vendor-friet-van-pansen', 'Dutch Fries', 'EUR 4.80', true, '🍟', 0, now()),
    ('product-friet-special', 'vendor-friet-van-pansen', 'Friet Speciaal', 'EUR 6.40', true, '🍟', 1, now()),
    ('product-haring-classic', 'vendor-haring-henk', 'Hollandse Nieuwe', 'EUR 5.70', true, '🐟', 0, now()),
    ('product-kibbeling', 'vendor-haring-henk', 'Kibbeling Cup', 'EUR 8.20', true, '🐟', 1, now())
on conflict (id) do update set
    vendor_id = excluded.vendor_id,
    name = excluded.name,
    price_label = excluded.price_label,
    is_available = excluded.is_available,
    image_symbol = excluded.image_symbol,
    sort_order = excluded.sort_order,
    updated_at = excluded.updated_at;
