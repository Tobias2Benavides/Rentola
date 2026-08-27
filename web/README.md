# Rentola — Web

Next.js 14 (App Router) + Supabase + Stripe Connect.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - Supabase URL/keys from **Project Settings → API** in your Supabase project
   - Stripe **test mode** keys from `dashboard.stripe.com/test/apikeys`
3. Apply the database migrations in `../supabase/migrations/` to your Supabase project (via the SQL editor, or `supabase db push` if you have the CLI + `SUPABASE_ACCESS_TOKEN` set).
4. Forward Stripe webhooks to your local server: `stripe listen --forward-to localhost:3000/api/stripe/webhook` — copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`.
5. `npm run dev` → [http://localhost:3000](http://localhost:3000)

## Payments (test mode)

Payouts use [Stripe Connect](https://stripe.com/docs/connect) Express accounts:

- A listing owner connects payouts from their **Profile** page (`ConnectStripeButton` → `/api/stripe/connect`). This is required before they can approve any rental request.
- A renter pays via Stripe Checkout after a request is approved (`RentalActions` → `/api/stripe/checkout`). The charge is split automatically: the platform fee (`PLATFORM_FEE_BPS` in `lib/stripe.ts`, currently 10%) stays with the platform account, the rest transfers to the owner's connected account.
- `/api/stripe/webhook` listens for `checkout.session.completed` (marks the rental paid) and `account.updated` (marks Connect onboarding complete).

While `STRIPE_SECRET_KEY` is a `sk_test_...` key, no real money moves — use [Stripe's test cards](https://stripe.com/docs/testing) (e.g. `4242 4242 4242 4242`) to exercise the full flow. Switching to a live Stripe account later is just swapping the env vars to live keys and pointing the webhook endpoint at the deployed URL.

## Chat

Messages are scoped to a `rental_id` (see `supabase/migrations/004_messages.sql`) and delivered live via Supabase Realtime — no separate service. A thread only exists once a rental request does.
