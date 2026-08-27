-- ============================================================
-- Migration: 004_messages.sql
-- In-rental chat between owner and renter.
--
-- Scoped to a rental_id (not open DMs) — a message thread only
-- exists once a rental request does, which keeps chat from being
-- a cold-DM spam vector.
-- ============================================================

create table public.messages (
    id          uuid        not null default gen_random_uuid(),
    rental_id   uuid        not null references public.rentals on delete cascade,
    sender_id   uuid        not null references auth.users on delete cascade,
    body        text        not null check (char_length(btrim(body)) > 0),
    created_at  timestamptz not null default now(),
    primary key (id)
);

alter table public.messages enable row level security;

create policy "Rental participants can view messages"
    on public.messages for select
    to authenticated
    using (
        exists (
            select 1 from public.rentals r
            where r.id = rental_id
              and (r.owner_id = (select auth.uid()) or r.renter_id = (select auth.uid()))
        )
    );

create policy "Rental participants can send messages"
    on public.messages for insert
    to authenticated
    with check (
        sender_id = (select auth.uid())
        and exists (
            select 1 from public.rentals r
            where r.id = rental_id
              and (r.owner_id = (select auth.uid()) or r.renter_id = (select auth.uid()))
        )
    );

create index messages_rental_id_idx on public.messages (rental_id, created_at);

-- Enable Realtime so both parties see messages live without polling
alter publication supabase_realtime add table public.messages;
