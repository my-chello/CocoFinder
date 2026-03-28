create extension if not exists pgcrypto;

create table users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    full_name text,
    role text not null check (role in ('customer', 'vendor')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table vendors (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    business_name text not null,
    description text,
    category text not null,
    phone text,
    status text not null default 'pending'
        check (status in ('pending', 'active', 'inactive', 'suspended')),
    is_open boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_vendors_user_id on vendors(user_id);
create index idx_vendors_category on vendors(category);
create index idx_vendors_status on vendors(status);

create table vendor_locations (
    id uuid primary key default gen_random_uuid(),
    vendor_id uuid not null references vendors(id) on delete cascade,
    latitude double precision not null,
    longitude double precision not null,
    recorded_at timestamptz not null default now()
);

create index idx_vendor_locations_vendor_id on vendor_locations(vendor_id);
create index idx_vendor_locations_recorded_at on vendor_locations(recorded_at);

create table products (
    id uuid primary key default gen_random_uuid(),
    vendor_id uuid not null references vendors(id) on delete cascade,
    name text not null,
    description text,
    price numeric(10,2) not null check (price >= 0),
    is_available boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_products_vendor_id on products(vendor_id);
create index idx_products_available on products(is_available);

create table favorites (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    vendor_id uuid not null references vendors(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique (user_id, vendor_id)
);

create index idx_favorites_user_id on favorites(user_id);
create index idx_favorites_vendor_id on favorites(vendor_id);
