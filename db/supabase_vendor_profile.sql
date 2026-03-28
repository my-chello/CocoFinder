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
