---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
last_updated: "2026-08-27T00:00:00.000Z"
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 2
  completed_plans: 1
  percent: 50
---

# Rentola — Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** The renter finds what they need nearby, requests it in seconds, and always knows the status of what they're renting.
**Current focus:** Phase 01 — foundation

## Position

- **Phase:** 03-rental-transaction-and-lifecycle (chat + payments added ahead of schedule)
- **Stopped At:** Listings, browse/search, the full rental lifecycle (request → approve/decline → pay → handoff → return, with atomic double-booking prevention), in-rental chat, and Stripe Connect payments (test mode) all work end-to-end. Reviews, moderation ("Report"/"Block"), and production deployment are not built yet.
- **Last session:** 2026-08-27

## Milestone: Beta Launch

**Goal:** Working P2P rental marketplace on the web — list, discover, request, lifecycle, dashboards, notifications, reviews — deployable to a custom domain.

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Foundation | Done — auth, profile | 2 |
| 2 | Marketplace Supply and Discovery | Done — listings CRUD, photo upload, browse/search | 2 |
| 3 | Rental Transaction and Lifecycle | Done — request/approve/decline, atomic double-booking prevention, handoff/return, dashboards; chat and Stripe Connect payments pulled forward into this phase | 2 |
| 4 | Trust and Launch Readiness | Pending — reviews, Report/Block, production deploy | — |

## Stack

- **Web:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + PostgREST, Auth, Storage, Realtime)
- **Deployment:** Vercel (planned, not yet configured)
- **Images:** Supabase Storage with CDN

## Decisions

- **2026-04-11: Pivoted from native iOS (SwiftUI) to a Next.js web app** — runs on any computer without Xcode/device constraints. The original Swift/Xcode source (`Rentola.xcodeproj`, `Rentola/`, `RentolaTests/`, `RentolaUITests/`) has been removed from the repo; the Supabase migration and RLS policy pattern from that phase carried over unchanged to `supabase/migrations/001_foundation.sql`.
- Supabase auth wired via `@supabase/ssr` — browser client (`web/lib/supabase/client.ts`), server client (`web/lib/supabase/server.ts`), and `web/middleware.ts` gating protected routes (`/browse`, `/dashboard`, `/profile`, `/listings`) and redirecting authenticated users away from auth pages.
- RLS enabled from the first migration (`profiles` table + `avatars` storage bucket) — this pattern must be repeated for every table added in Phase 2+ (listings, rentals, reviews), not retrofitted.
- supabase db push not executed — Supabase CLI not installed and no SUPABASE_ACCESS_TOKEN set; documented as user setup step

## Notes on scope taken vs. original roadmap

- **Proximity search deferred:** Browse uses keyword + category filtering with a plain `city` text field, not PostGIS `ST_DWithin`. The original plan's own fallback (city-text when location is denied) became the only path for now — full geo search is still open.
- **Payments implemented ahead of Phase 4:** Stripe Connect (Express accounts, destination charges, 10% platform fee) was built in test mode — see `web/README.md` for the local setup (`stripe listen`, test cards). Going live is a matter of swapping in live Stripe keys; no code change needed.
- **Chat added (not in original roadmap):** messages are scoped to `rental_id`, delivered via Supabase Realtime — see `supabase/migrations/004_messages.sql`.
- **Email notifications not built:** the original plan's Resend/Edge Function notification layer (approve/decline emails, 24h expiry warnings) is not implemented — dashboard + realtime chat are the only signal right now.
- **LIFE-03 partially covered (in-app only):** added a "Due back tomorrow" banner to the dashboard (`app/(app)/dashboard/page.tsx`, `lib/format.ts#isDueTomorrow`) that surfaces any `active` rental whose `end_date` is tomorrow, for both the renter and owner side, with a link to the rental. This satisfies the requirement's intent (LIFE-03: 24h-before notification) without the Resend/Edge Function/pg_cron infrastructure — it only fires while someone visits the dashboard, so it's a stopgap for the real push/email notification, not a replacement for it. 2026-08-28.

## Next Action

Phase 4: reviews (mutual, triggered on `returned` status), "Report Listing"/"Block User", and production deployment to Vercel with the Stripe webhook endpoint pointed at the live domain.

---
*Initialized: 2026-04-06*
*Pivoted to web (Next.js) and iOS code removed: 2026-08-27*
*Listings, rental lifecycle, chat, and Stripe Connect (test mode) built: 2026-08-27*
