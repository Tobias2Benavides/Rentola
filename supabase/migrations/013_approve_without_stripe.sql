-- ============================================================
-- Migration: 013_approve_without_stripe.sql
-- respond_to_rental required stripe_onboarding_complete before an
-- owner could even approve a request -- with no Stripe account
-- connected yet, that blocked approval entirely, before payment ever
-- came into it. Now accepts payment_instructions (the manual Tikkie/
-- IBAN path from 012) as an equally valid "ready to get paid" signal.
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

        select stripe_onboarding_complete or payment_instructions is not null into v_owner_ready
        from public.profiles where id = v_rental.owner_id;

        if not coalesce(v_owner_ready, false) then
            raise exception 'Connect a Stripe payout account, or add payment instructions to your profile, before approving requests';
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
