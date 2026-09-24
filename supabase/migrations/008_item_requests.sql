-- ============================================================
-- Migration: 008_item_requests.sql
-- "Wanted" board — a renter asks for an item nobody has listed yet
-- ============================================================

create table public.item_requests (
    id              uuid        not null default gen_random_uuid(),
    requester_id    uuid        not null references auth.users on delete cascade,
    title           text        not null,
    description     text,
    category        text        not null,
    city            text        not null,
    created_at      timestamptz not null default now(),
    primary key (id)
);

alter table public.item_requests enable row level security;

-- Visible to any signed-in user, so owners can spot demand and list a match
create policy "Authenticated users can view item requests"
    on public.item_requests for select
    to authenticated
    using (true);

create policy "Users can create their own item requests"
    on public.item_requests for insert
    to authenticated
    with check ( requester_id = (select auth.uid()) );

create policy "Requesters can delete their own item requests"
    on public.item_requests for delete
    to authenticated
    using ( requester_id = (select auth.uid()) );

create index item_requests_requester_id_idx on public.item_requests (requester_id);
create index item_requests_created_at_idx on public.item_requests (created_at desc);
