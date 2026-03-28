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

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Public can view profile photos" on storage.objects;
drop policy if exists "Users can upload their own profile photos" on storage.objects;
drop policy if exists "Users can update their own profile photos" on storage.objects;
drop policy if exists "Users can delete their own profile photos" on storage.objects;

create policy "Public can view profile photos"
on storage.objects
for select
to public
using (bucket_id = 'profile-photos');

create policy "Users can upload their own profile photos"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their own profile photos"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own profile photos"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
);
