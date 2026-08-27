-- ============================================================
-- Migration: 003_rentals.sql
-- Phase 3: Rental Transaction and Lifecycle
--
-- All status transitions go through SECURITY DEFINER RPC functions,
-- never through direct UPDATEs from the client. This is what makes
-- the double-booking check below actually safe under concurrency —
-- see PITFALLS.md #3 in .planning/research.
-- ============================================================

-- Stripe Connect fields on profiles, needed by respond_to_rental's payout
-- gate below (an owner must be able to receive money before they can
-- approve a request).
alter table public.profiles add column stripe_account_id text;
alter table public.profiles add column stripe_onboarding_complete boolean not null default false;

create type public.rental_status as enum (
    'pending', 'approved', 'declined', 'active', 'returned', 'cancelled'
);

create table public.rentals (
    id              uuid            not null default gen_random_uuid(),
    listing_id      uuid            not null references public.listings on delete cascade,
    owner_id        uuid            not null references auth.users on delete cascade,
    renter_id       uuid            not null references auth.users on delete cascade,
    status          rental_status   not null default 'pending',
    start_date      date            not null,
    end_date        date            not null,
    message         text,
    total_price     numeric(10,2)   not null,
    payment_status  text            not null default 'unpaid'
                        check (payment_status in ('unpaid', 'paid', 'refunded')),
    stripe_checkout_session_id text,
    stripe_payment_intent_id   text,
    created_at      timestamptz     not null default now(),
    updated_at      timestamptz     not null default now(),
    primary key (id),
    constraint renter_not_owner check (renter_id <> owner_id),
    constraint valid_date_range check (end_date > start_date)
);

alter table public.rentals enable row level security;

-- Only the two participants can ever see a rental
create policy "Participants can view their rentals"
    on public.rentals for select
    to authenticated
    using ( owner_id = (select auth.uid()) or renter_id = (select auth.uid()) );

-- Direct inserts/updates are otherwise blocked by RLS (no insert/update policy) —
-- all writes happen inside the SECURITY DEFINER functions below, which run as
-- the table owner and enforce the business rules themselves.

create trigger rentals_updated_at
    before update on public.rentals
    for each row execute procedure public.set_updated_at();

create index rentals_listing_id_idx on public.rentals (listing_id);
create index rentals_owner_id_idx on public.rentals (owner_id);
create index rentals_renter_id_idx on public.rentals (renter_id);

-- ============================================================
-- RPC: request_rental
-- Renter requests to rent a listing for a date range.
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

grant execute on function public.request_rental(uuid, date, date, text) to authenticated;

-- ============================================================
-- RPC: respond_to_rental
-- Owner approves or declines a pending request. Approval is the
-- double-booking-sensitive path: an advisory lock on the listing
-- serializes concurrent approvals so two overlapping requests can
-- never both win the race.
-- ============================================================

create or replace function public.respond_to_rental(
    p_rental_id uuid,
    p_approve boolean
)
returns public.rentals
language plpgsql
security definer set search_path = ''
as $$
declare
    v_rental public.rentals;
    v_owner_ready boolean;
    v_conflict boolean;
begin
    select * into v_rental from public.rentals where id = p_rental_id for update;
    if v_rental is null then
        raise exception 'Rental not found';
    end if;
    if v_rental.owner_id <> auth.uid() then
        raise exception 'Only the listing owner can respond to this request';
    end if;
    if v_rental.status <> 'pending' then
        raise exception 'This request has already been responded to';
    end if;

    if p_approve then
        -- Serialize approvals per listing so two concurrent approve calls
        -- for overlapping date ranges can't both pass the conflict check below.
        perform pg_advisory_xact_lock(hashtext(v_rental.listing_id::text));

        select stripe_onboarding_complete into v_owner_ready
        from public.profiles where id = v_rental.owner_id;

        if not coalesce(v_owner_ready, false) then
            raise exception 'Connect a Stripe payout account before approving requests';
        end if;

        select exists (
            select 1
            from public.rentals
            where listing_id = v_rental.listing_id
              and id <> v_rental.id
              and status in ('approved', 'active')
              and daterange(start_date, end_date, '[]') && daterange(v_rental.start_date, v_rental.end_date, '[]')
            for update
        ) into v_conflict;

        if v_conflict then
            update public.rentals set status = 'declined' where id = p_rental_id returning * into v_rental;
            raise exception 'Those dates were just booked by another request';
        end if;

        update public.rentals set status = 'approved' where id = p_rental_id returning * into v_rental;
    else
        update public.rentals set status = 'declined' where id = p_rental_id returning * into v_rental;
    end if;

    return v_rental;
end;
$$;

grant execute on function public.respond_to_rental(uuid, boolean) to authenticated;

-- ============================================================
-- RPC: cancel_rental
-- Either party can cancel before payment. Once paid, cancellation
-- requires a refund flow — out of scope for v1, so it's blocked here.
-- ============================================================

create or replace function public.cancel_rental(p_rental_id uuid)
returns public.rentals
language plpgsql
security definer set search_path = ''
as $$
declare
    v_rental public.rentals;
begin
    select * into v_rental from public.rentals where id = p_rental_id for update;
    if v_rental is null then
        raise exception 'Rental not found';
    end if;
    if v_rental.owner_id <> auth.uid() and v_rental.renter_id <> auth.uid() then
        raise exception 'Not a participant in this rental';
    end if;
    if v_rental.status not in ('pending', 'approved') then
        raise exception 'This rental can no longer be cancelled';
    end if;
    if v_rental.payment_status = 'paid' then
        raise exception 'A paid rental cannot be self-service cancelled — contact support for a refund';
    end if;

    update public.rentals set status = 'cancelled' where id = p_rental_id returning * into v_rental;
    return v_rental;
end;
$$;

grant execute on function public.cancel_rental(uuid) to authenticated;

-- ============================================================
-- RPC: confirm_rental_handoff
-- Either party confirms the item changed hands. Requires payment
-- to be complete first — this is the payment gate for the lifecycle.
-- ============================================================

create or replace function public.confirm_rental_handoff(p_rental_id uuid)
returns public.rentals
language plpgsql
security definer set search_path = ''
as $$
declare
    v_rental public.rentals;
begin
    select * into v_rental from public.rentals where id = p_rental_id for update;
    if v_rental is null then
        raise exception 'Rental not found';
    end if;
    if v_rental.owner_id <> auth.uid() and v_rental.renter_id <> auth.uid() then
        raise exception 'Not a participant in this rental';
    end if;
    if v_rental.status <> 'approved' then
        raise exception 'This rental is not ready for handoff';
    end if;
    if v_rental.payment_status <> 'paid' then
        raise exception 'Payment must be completed before handoff';
    end if;

    update public.rentals set status = 'active' where id = p_rental_id returning * into v_rental;
    return v_rental;
end;
$$;

grant execute on function public.confirm_rental_handoff(uuid) to authenticated;

-- ============================================================
-- RPC: confirm_rental_return
-- Either party confirms the item has been returned.
-- ============================================================

create or replace function public.confirm_rental_return(p_rental_id uuid)
returns public.rentals
language plpgsql
security definer set search_path = ''
as $$
declare
    v_rental public.rentals;
begin
    select * into v_rental from public.rentals where id = p_rental_id for update;
    if v_rental is null then
        raise exception 'Rental not found';
    end if;
    if v_rental.owner_id <> auth.uid() and v_rental.renter_id <> auth.uid() then
        raise exception 'Not a participant in this rental';
    end if;
    if v_rental.status <> 'active' then
        raise exception 'This rental is not active';
    end if;

    update public.rentals set status = 'returned' where id = p_rental_id returning * into v_rental;
    return v_rental;
end;
$$;

grant execute on function public.confirm_rental_return(uuid) to authenticated;
