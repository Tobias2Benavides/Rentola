-- ============================================================
-- Migration: 007_notifications.sql
-- In-app notifications: "you got paid", "request approved",
-- "bring it back tomorrow", etc. — shown via a bell icon, and
-- (separately) fanned out to email via a database webhook.
-- ============================================================

create table public.notifications (
    id          uuid        not null default gen_random_uuid(),
    user_id     uuid        not null references auth.users on delete cascade,
    type        text        not null,
    title       text        not null,
    body        text,
    link        text,
    read        boolean     not null default false,
    created_at  timestamptz not null default now(),
    primary key (id)
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
    on public.notifications for select
    to authenticated
    using ( user_id = (select auth.uid()) );

create policy "Users can mark their own notifications read"
    on public.notifications for update
    to authenticated
    using ( user_id = (select auth.uid()) )
    with check ( user_id = (select auth.uid()) );

-- Inserts happen only from SECURITY DEFINER functions / the server-side
-- admin client — no insert policy for regular users.

create index notifications_user_id_idx on public.notifications (user_id, created_at desc);

alter publication supabase_realtime add table public.notifications;

-- ============================================================
-- Notify the owner when a new request comes in.
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
    v_conflict boolean;
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

    select exists (
        select 1
        from public.rentals
        where listing_id = p_listing_id
          and status in ('approved', 'active')
          and daterange(start_date, end_date, '[]') && daterange(p_start_date, p_end_date, '[]')
    ) into v_conflict;

    if v_conflict then
        raise exception 'Those dates are already booked';
    end if;

    v_days := p_end_date - p_start_date;

    insert into public.rentals (listing_id, owner_id, renter_id, start_date, end_date, message, total_price)
    values (p_listing_id, v_listing.owner_id, auth.uid(), p_start_date, p_end_date, nullif(p_message, ''), v_days * v_listing.price_per_day)
    returning * into v_rental;

    insert into public.notifications (user_id, type, title, body, link)
    values (
        v_listing.owner_id,
        'rental_requested',
        'New rental request',
        'Someone wants to rent "' || v_listing.title || '" from ' || p_start_date || ' to ' || p_end_date || '.',
        '/rentals/' || v_rental.id
    );

    return v_rental;
end;
$$;

grant execute on function public.request_rental(uuid, date, date, text) to authenticated;

-- ============================================================
-- Notify the renter when the owner approves or declines.
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
    v_listing_title text;
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

    select title into v_listing_title from public.listings where id = v_rental.listing_id;

    if p_approve then
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

        insert into public.notifications (user_id, type, title, body, link)
        values (
            v_rental.renter_id,
            'rental_approved',
            'Request approved',
            'Your request for "' || v_listing_title || '" was approved — pay now to confirm pickup.',
            '/rentals/' || v_rental.id
        );
    else
        update public.rentals set status = 'declined' where id = p_rental_id returning * into v_rental;

        insert into public.notifications (user_id, type, title, body, link)
        values (
            v_rental.renter_id,
            'rental_declined',
            'Request declined',
            'Your request for "' || v_listing_title || '" was declined.',
            '/rentals/' || v_rental.id
        );
    end if;

    return v_rental;
end;
$$;

grant execute on function public.respond_to_rental(uuid, boolean) to authenticated;

-- ============================================================
-- Notify the owner when the renter confirms handoff (heads up
-- that the item has left, and the return date to expect it back).
-- ============================================================

create or replace function public.confirm_rental_handoff(p_rental_id uuid)
returns public.rentals
language plpgsql
security definer set search_path = ''
as $$
declare
    v_rental public.rentals;
    v_listing_title text;
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

    select title into v_listing_title from public.listings where id = v_rental.listing_id;

    insert into public.notifications (user_id, type, title, body, link)
    select
        u,
        'rental_active',
        'Rental is active',
        '"' || v_listing_title || '" is picked up — due back ' || v_rental.end_date || '.',
        '/rentals/' || v_rental.id
    from unnest(array[v_rental.owner_id, v_rental.renter_id]) as u
    where u <> auth.uid();

    return v_rental;
end;
$$;

grant execute on function public.confirm_rental_handoff(uuid) to authenticated;

-- ============================================================
-- Notify the other party when a rental is returned or cancelled.
-- ============================================================

create or replace function public.confirm_rental_return(p_rental_id uuid)
returns public.rentals
language plpgsql
security definer set search_path = ''
as $$
declare
    v_rental public.rentals;
    v_listing_title text;
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

    select title into v_listing_title from public.listings where id = v_rental.listing_id;

    insert into public.notifications (user_id, type, title, body, link)
    select
        u,
        'rental_returned',
        'Rental returned',
        '"' || v_listing_title || '" has been marked as returned.',
        '/rentals/' || v_rental.id
    from unnest(array[v_rental.owner_id, v_rental.renter_id]) as u
    where u <> auth.uid();

    return v_rental;
end;
$$;

grant execute on function public.confirm_rental_return(uuid) to authenticated;

create or replace function public.cancel_rental(p_rental_id uuid)
returns public.rentals
language plpgsql
security definer set search_path = ''
as $$
declare
    v_rental public.rentals;
    v_listing_title text;
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

    select title into v_listing_title from public.listings where id = v_rental.listing_id;

    insert into public.notifications (user_id, type, title, body, link)
    select
        u,
        'rental_cancelled',
        'Request cancelled',
        'The request for "' || v_listing_title || '" was cancelled.',
        '/rentals/' || v_rental.id
    from unnest(array[v_rental.owner_id, v_rental.renter_id]) as u
    where u <> auth.uid();

    return v_rental;
end;
$$;

grant execute on function public.cancel_rental(uuid) to authenticated;
