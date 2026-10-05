-- ============================================================
-- Migration: 012_manual_payment.sql
-- Interim payment path for owners without Stripe payouts connected
-- yet: show the renter how to pay the owner directly (a personal
-- Tikkie link, an IBAN, whatever the owner puts there), then let the
-- owner confirm receipt themselves. Only the owner can confirm --
-- the person receiving money is the only one who can truthfully say
-- it arrived.
--
-- Deliberately not automated: Tikkie's own site only offers
-- programmatic link generation through a registered "Tikkie for
-- Business" partnership, not a self-serve API, so this is a manual
-- bridge until real Stripe payouts are connected -- same rentals
-- table, same lifecycle, no schema fork.
-- ============================================================

alter table public.profiles add column payment_instructions text;

create or replace function public.confirm_manual_payment(p_rental_id uuid)
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
    if v_rental.owner_id <> auth.uid() then
        raise exception 'Only the listing owner can confirm payment';
    end if;
    if v_rental.status <> 'approved' then
        raise exception 'This rental is not approved yet';
    end if;
    if v_rental.payment_status <> 'unpaid' then
        raise exception 'This rental has already been paid';
    end if;

    update public.rentals set payment_status = 'paid' where id = p_rental_id returning * into v_rental;

    select title into v_listing_title from public.listings where id = v_rental.listing_id;

    insert into public.notifications (user_id, type, title, body, link)
    select
        v_rental.renter_id,
        'payment_confirmed',
        'Payment confirmed',
        'The owner confirmed your payment for "' || v_listing_title || '" -- you can coordinate handoff now.',
        '/rentals/' || v_rental.id;

    return v_rental;
end;
$$;

grant execute on function public.confirm_manual_payment(uuid) to authenticated;
