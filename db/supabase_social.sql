create table if not exists public.app_favorites (
    user_id uuid not null references auth.users (id) on delete cascade,
    vendor_id text not null,
    created_at timestamptz not null default now(),
    primary key (user_id, vendor_id)
);

create table if not exists public.app_conversations (
    id text primary key,
    customer_user_id uuid not null references auth.users (id) on delete cascade,
    vendor_id text not null,
    customer_deleted boolean not null default false,
    customer_unread_count integer not null default 0,
    last_message_preview text not null default '',
    last_message_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

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
