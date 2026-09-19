-- ============================================================
-- Migration: 005_late_fees.sql
-- Late-return fees: charge the renter's saved card for extra
-- days when a rental is returned after its end_date.
-- ============================================================

-- Stripe Customer + saved payment method from the original checkout,
-- needed to charge again later without the renter re-entering a card.
alter table public.rentals add column stripe_customer_id text;
alter table public.rentals add column stripe_payment_method_id text;

-- Outcome of the late-fee charge attempt, if the rental was returned late.
alter table public.rentals add column late_fee_amount numeric(10,2);
alter table public.rentals add column late_fee_status text
    check (late_fee_status is null or late_fee_status in ('charged', 'failed', 'no_payment_method'));
alter table public.rentals add column late_fee_payment_intent_id text;
