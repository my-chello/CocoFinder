-- CocoFinder participant-based messaging migration
-- Future-facing schema for customer<->vendor and vendor<->vendor messaging.
-- Run this only when the app code is ready to use participant-based conversations.

-- 1. Extend conversations with a generic type
alter table public.app_conversations
    add column if not exists conversation_type text;

alter table public.app_conversations
    alter column customer_user_id drop not null;

alter table public.app_conversations
    alter column vendor_id drop not null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'app_conversations_conversation_type_check'
    ) then
        alter table public.app_conversations
            add constraint app_conversations_conversation_type_check
            check (conversation_type in ('customer_vendor', 'vendor_vendor'));
    end if;
end $$;

update public.app_conversations
set conversation_type = 'customer_vendor'
where conversation_type is null;

alter table public.app_conversations
    alter column conversation_type set default 'customer_vendor';

-- 2. Create normalized conversation participants
create table if not exists public.app_conversation_participants (
    conversation_id text not null references public.app_conversations (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    role text not null check (role in ('customer', 'vendor')),
    is_deleted boolean not null default false,
    unread_count integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (conversation_id, user_id)
);

create index if not exists idx_app_conversation_participants_user
    on public.app_conversation_participants(user_id, updated_at desc);

create index if not exists idx_app_conversation_participants_conversation
    on public.app_conversation_participants(conversation_id);

alter table public.app_conversation_participants enable row level security;

create or replace function public.is_conversation_participant(target_conversation_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.app_conversation_participants p
        where p.conversation_id = target_conversation_id
          and p.user_id = auth.uid()
    );
$$;

grant execute on function public.is_conversation_participant(text) to authenticated;

create or replace function public.can_access_conversation_row(
    target_conversation_id text,
    target_customer_user_id uuid,
    target_vendor_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
    select
        auth.uid() = target_customer_user_id
        or auth.uid() = target_vendor_user_id
        or public.is_conversation_participant(target_conversation_id);
$$;

grant execute on function public.can_access_conversation_row(text, uuid, uuid) to authenticated;

create or replace function public.can_access_conversation_participants(
    target_conversation_id text
)
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.app_conversations c
        where c.id = target_conversation_id
          and (
            auth.uid() = c.customer_user_id
            or auth.uid() = c.vendor_user_id
          )
    )
    or public.is_conversation_participant(target_conversation_id);
$$;

grant execute on function public.can_access_conversation_participants(text) to authenticated;

create or replace function public.get_conversation_profile_names(
    target_conversation_ids text[]
)
returns table (
    conversation_id text,
    user_id uuid,
    display_name text,
    profile_photo_url text
)
language sql
security definer
set search_path = public
as $$
    select
        p.conversation_id,
        p.user_id,
        nullif(trim(concat_ws(' ', pr.first_name, pr.last_name)), ''),
        pr.profile_photo_url
    from public.app_conversation_participants p
    join public.profiles pr
      on pr.id = p.user_id
    where p.conversation_id = any(target_conversation_ids)
      and public.is_conversation_participant(p.conversation_id);
$$;

grant execute on function public.get_conversation_profile_names(text[]) to authenticated;

-- 3. Extend messages with sender identity
alter table public.app_messages
    add column if not exists sender_user_id uuid references auth.users (id) on delete set null;

create index if not exists idx_app_messages_sender_user
    on public.app_messages(sender_user_id, sent_at desc);

-- 4. Backfill participants from the current customer/vendor model
insert into public.app_conversation_participants (
    conversation_id,
    user_id,
    role,
    is_deleted,
    unread_count,
    created_at,
    updated_at
)
select
    c.id,
    c.customer_user_id,
    'customer',
    c.customer_deleted,
    c.customer_unread_count,
    c.created_at,
    c.updated_at
from public.app_conversations c
where c.customer_user_id is not null
on conflict (conversation_id, user_id) do update set
    role = excluded.role,
    is_deleted = excluded.is_deleted,
    unread_count = excluded.unread_count,
    updated_at = excluded.updated_at;

insert into public.app_conversation_participants (
    conversation_id,
    user_id,
    role,
    is_deleted,
    unread_count,
    created_at,
    updated_at
)
select
    c.id,
    c.vendor_user_id,
    'vendor',
    c.vendor_deleted,
    c.vendor_unread_count,
    c.created_at,
    c.updated_at
from public.app_conversations c
where c.vendor_user_id is not null
on conflict (conversation_id, user_id) do update set
    role = excluded.role,
    is_deleted = excluded.is_deleted,
    unread_count = excluded.unread_count,
    updated_at = excluded.updated_at;

-- 5. Best-effort backfill of sender_user_id from existing customer/vendor rows
update public.app_messages m
set sender_user_id = case
    when m.sender_role = 'customer' then c.customer_user_id
    when m.sender_role = 'vendor' then c.vendor_user_id
    else null
end
from public.app_conversations c
where c.id = m.conversation_id
  and m.sender_user_id is null;

-- 6. Replace conversation policies with participant-based access
drop policy if exists "Customers can view their own conversations" on public.app_conversations;
drop policy if exists "Customers can manage their own conversations" on public.app_conversations;
drop policy if exists "Vendors can view their own conversations" on public.app_conversations;
drop policy if exists "Vendors can manage their own conversations" on public.app_conversations;
drop policy if exists "Participants can view their own conversations" on public.app_conversations;
drop policy if exists "Participants can update their own conversations" on public.app_conversations;
drop policy if exists "Authenticated users can insert conversations" on public.app_conversations;

create policy "Participants can view their own conversations"
on public.app_conversations
for select
to authenticated
using (public.can_access_conversation_row(id, customer_user_id, vendor_user_id));

create policy "Participants can update their own conversations"
on public.app_conversations
for update
to authenticated
using (public.can_access_conversation_row(id, customer_user_id, vendor_user_id))
with check (public.can_access_conversation_row(id, customer_user_id, vendor_user_id));

create policy "Authenticated users can insert conversations"
on public.app_conversations
for insert
to authenticated
with check (auth.uid() = customer_user_id or auth.uid() = vendor_user_id);

-- 7. Participant table policies
drop policy if exists "Participants can view conversation participants" on public.app_conversation_participants;
drop policy if exists "Participants can update conversation participants" on public.app_conversation_participants;
drop policy if exists "Authenticated users can insert participants" on public.app_conversation_participants;

create policy "Participants can view conversation participants"
on public.app_conversation_participants
for select
to authenticated
using (public.can_access_conversation_participants(conversation_id));

create policy "Participants can update conversation participants"
on public.app_conversation_participants
for update
to authenticated
using (public.can_access_conversation_participants(conversation_id))
with check (true);

create policy "Authenticated users can insert participants"
on public.app_conversation_participants
for insert
to authenticated
with check (public.can_access_conversation_participants(conversation_id));

-- 8. Replace message policies with participant-based access
drop policy if exists "Customers can view messages in their conversations" on public.app_messages;
drop policy if exists "Customers can insert messages in their conversations" on public.app_messages;
drop policy if exists "Vendors can view messages in their conversations" on public.app_messages;
drop policy if exists "Vendors can insert messages in their conversations" on public.app_messages;
drop policy if exists "Participants can view messages in their conversations" on public.app_messages;
drop policy if exists "Participants can insert messages in their conversations" on public.app_messages;

create policy "Participants can view messages in their conversations"
on public.app_messages
for select
to authenticated
using (public.is_conversation_participant(conversation_id));

create policy "Participants can insert messages in their conversations"
on public.app_messages
for insert
to authenticated
with check (
    sender_user_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
);
