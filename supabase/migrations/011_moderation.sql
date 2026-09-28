-- ============================================================
-- Migration: 011_moderation.sql
-- Phase 4: report a listing, block a user.
--
-- Blocking is enforced at the listings/item_requests RLS level (not
-- just filtered client-side in Browse), so it's bidirectional, applies
-- even to a direct /browse/[id] URL, and never reveals to either party
-- that a block exists -- a blocked listing just looks like it doesn't
-- exist, same as the existing rental access-control behavior.
--
-- request_rental is SECURITY DEFINER, so it bypasses RLS on listings
-- entirely -- the block check has to be duplicated inside it explicitly,
-- the same reason double-booking has its own check rather than relying
-- on a policy.
-- ============================================================

create table public.reports (
    id           uuid        not null default gen_random_uuid(),
    reporter_id  uuid        not null references auth.users on delete cascade,
    listing_id   uuid        not null references public.listings on delete cascade,
    reason       text        not null check (reason in ('inappropriate', 'prohibited_item', 'spam', 'scam', 'other')),
    details      text,
    status       text        not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
    created_at   timestamptz not null default now(),
    primary key (id)
);

alter table public.reports enable row level security;

-- Reports are confidential -- only the reporter sees their own; there's no
-- admin UI yet, so review happens directly against this table.
create policy "Users can view their own reports"
    on public.reports for select
    to authenticated
    using ( reporter_id = (select auth.uid()) );

create policy "Users can file reports"
    on public.reports for insert
    to authenticated
    with check ( reporter_id = (select auth.uid()) );

create index reports_listing_id_idx on public.reports (listing_id);

-- ============================================================

create table public.blocks (
    id          uuid        not null default gen_random_uuid(),
    blocker_id  uuid        not null references auth.users on delete cascade,
    blocked_id  uuid        not null references auth.users on delete cascade,
    created_at  timestamptz not null default now(),
    primary key (id),
    unique (blocker_id, blocked_id),
    constraint cannot_block_self check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

-- A user only ever sees blocks where they're the blocker -- never whether
-- someone has blocked them, same confidentiality reasoning as reports.
create policy "Users can view who they've blocked"
    on public.blocks for select
    to authenticated
    using ( blocker_id = (select auth.uid()) );

create policy "Users can block others"
    on public.blocks for insert
    to authenticated
    with check ( blocker_id = (select auth.uid()) );

create policy "Users can unblock"
    on public.blocks for delete
    to authenticated
    using ( blocker_id = (select auth.uid()) );

create index blocks_blocker_id_idx on public.blocks (blocker_id);
create index blocks_blocked_id_idx on public.blocks (blocked_id);

-- ============================================================
-- Extend listings/item_requests visibility to hide either side of a
-- blocked relationship from the other, in both directions.
-- ============================================================

drop policy "Authenticated users can view active listings" on public.listings;

create policy "Authenticated users can view active listings"
    on public.listings for select
    to authenticated
    using (
        (is_active = true or owner_id = (select auth.uid()))
        and not exists (
            select 1 from public.blocks
            where (blocker_id = (select auth.uid()) and blocked_id = listings.owner_id)
               or (blocker_id = listings.owner_id and blocked_id = (select auth.uid()))
        )
    );

drop policy "Authenticated users can view item requests" on public.item_requests;

create policy "Authenticated users can view item requests"
    on public.item_requests for select
    to authenticated
    using (
        not exists (
            select 1 from public.blocks
            where (blocker_id = (select auth.uid()) and blocked_id = item_requests.requester_id)
               or (blocker_id = item_requests.requester_id and blocked_id = (select auth.uid()))
        )
    );

-- ============================================================
-- Re-guard request_rental: a blocked relationship (either direction)
-- can't produce a new rental, even though it's SECURITY DEFINER and
-- would otherwise bypass the listings RLS above entirely.
-- ============================================================

create or replace function public.request_rental(
    p_listing_id uuid,
    p_start_date date,
    p_end_date date,
    p_message text
)
returns public.rentals
language plpgsql
security definer set search_path = ''
as $$
declare
    v_listing public.listings;
    v_days int;
    v_rental public.rentals;
begin
    if auth.uid() is null then
        raise exception 'Not authenticated';
    end if;

    select * into v_listing from public.listings where id = p_listing_id and is_active = true;
    if v_listing is null then
        raise exception 'Listing not found or no longer active';
    end if;

    if v_listing.owner_id = auth.uid() then
        raise exception 'You cannot rent your own listing';
    end if;

    if exists (
        select 1 from public.blocks
        where (blocker_id = auth.uid() and blocked_id = v_listing.owner_id)
           or (blocker_id = v_listing.owner_id and blocked_id = auth.uid())
    ) then
        raise exception 'You cannot request this listing';
    end if;

    if p_end_date <= p_start_date then
        raise exception 'End date must be after start date';
    end if;

    if p_start_date < current_date then
        raise exception 'Start date cannot be in the past';
    end if;

    v_days := p_end_date - p_start_date;

    insert into public.rentals (listing_id, owner_id, renter_id, start_date, end_date, message, total_price)
    values (p_listing_id, v_listing.owner_id, auth.uid(), p_start_date, p_end_date, nullif(p_message, ''), v_days * v_listing.price_per_day)
    returning * into v_rental;

    return v_rental;
end;
$$;
