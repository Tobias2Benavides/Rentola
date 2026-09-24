---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
last_updated: "2026-09-24T00:00:00.000Z"
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 2
  completed_plans: 1
  percent: 75
---

# Rentola — Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** The renter finds what they need nearby, requests it in seconds, and always knows the status of what they're renting.
**Current focus:** Phase 01 — foundation

## Position

- **Phase:** 04-trust-and-launch-readiness (reviews shipped; moderation and final production wiring remain)
- **Stopped At:** Listings, browse/search, the full rental lifecycle, in-rental chat, and Stripe Connect payments (test mode) all work end-to-end. Mutual reviews (`supabase/migrations/009_reviews.sql`) are now built and populate `profiles.average_rating`, surfaced on the listing owner card and the profile page. A "wanted board" (`item_requests`, not in the original roadmap) lets renters post what they're looking for. rentify.nl DNS is verified for Resend, but the email-sending webhook still needs `RESEND_API_KEY` / `SUPABASE_DB_WEBHOOK_SECRET` set and the Supabase Database Webhook created before it actually sends mail. Moderation ("Report"/"Block") and final production deployment are not built yet.
- **Last session:** 2026-09-24

## Milestone: Beta Launch

**Goal:** Working P2P rental marketplace on the web — list, discover, request, lifecycle, dashboards, notifications, reviews — deployable to a custom domain.

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Foundation | Done — auth, profile | 2 |
| 2 | Marketplace Supply and Discovery | Done — listings CRUD, photo upload, browse/search | 2 |
| 3 | Rental Transaction and Lifecycle | Done — request/approve/decline, atomic double-booking prevention, handoff/return, dashboards; chat and Stripe Connect payments pulled forward into this phase | 2 |
| 4 | Trust and Launch Readiness | In progress — reviews done; Report/Block and production deploy pending | — |

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
- **Email notifications partially built:** in-app notifications (`supabase/migrations/007_notifications.sql`) fire on every relevant event, and a webhook route (`web/app/api/notifications/send-email/route.ts`) forwards them to Resend. rentify.nl is DNS-verified in Resend (DKIM/SPF/DMARC all confirmed live via `dig`). Still missing: `RESEND_API_KEY` and `SUPABASE_DB_WEBHOOK_SECRET` in env vars (local + Vercel), and the actual Supabase Database Webhook pointing at the deployed route. Until those three things happen, no email actually sends.
- **LIFE-03 partially covered (in-app only):** added a "Due back tomorrow" banner to the dashboard (`app/(app)/dashboard/page.tsx`, `lib/format.ts#isDueTomorrow`) that surfaces any `active` rental whose `end_date` is tomorrow, for both the renter and owner side, with a link to the rental. This satisfies the requirement's intent (LIFE-03: 24h-before notification) without the Resend/Edge Function/pg_cron infrastructure — it only fires while someone visits the dashboard, so it's a stopgap for the real push/email notification, not a replacement for it. 2026-08-28.
- **Reviews shipped (2026-09-24):** `supabase/migrations/009_reviews.sql` — mutual reviews once a rental hits `returned`, RLS-gated via an `exists` subquery (same pattern as messages, not an RPC — no concurrency race to guard here). A trigger keeps `profiles.average_rating` in sync. Surfaced on `browse/[id]` (owner card) and `profile` (own rating + received reviews list).
- **Item requests / "wanted board" (2026-09-24, not in original roadmap):** `supabase/migrations/008_item_requests.sql` — any signed-in user can post what they're looking for; visible to everyone so owners can spot demand. Simple RLS (view: all authenticated; insert/delete: own rows only), no moderation or fulfillment tracking.
- **Design skills installed (2026-09-24):** `emilkowalski/skills` (animation/taste, 11 of 13 sub-skills — skipped `write-swift` and `animate-expo` as not applicable to this stack) and two `taste-skill` variants (`redesign-existing-projects`, `minimalist-ui`), all in `.agents/skills/` with `.claude/skills/` symlinks. `pbakaus/impeccable` was evaluated and deliberately deferred — see Backlog below.
- **Playwright MCP added (2026-09-24):** `.mcp.json` at the repo root registers `@playwright/mcp` as a project-scoped MCP server. Not yet paired with an actual `@playwright/test` suite — currently just gives a future session browser-automation tools, no persisted/CI-runnable tests exist yet.

## Next Action

Finish wiring the email notification pipeline (Resend API key + webhook secret + Supabase Database Webhook), then Phase 4's remaining pieces: "Report Listing"/"Block User" moderation and production deployment to Vercel with the Stripe webhook endpoint pointed at the live domain.

## Backlog

- **`pbakaus/impeccable` design skill** — evaluated 2026-09-24, not installed. It's meaningfully heavier than a plain-text skill: a closed-source compiled binary (not readable like a SKILL.md), an auto-running hook that fires on every UI edit and on Stop independent of normal tool-approval (its own docs say it can still execute even if a session denies the launcher command), and a "live mode" that can run a script from `package.json` with full user permissions. Revisit once the lighter skills (`emilkowalski/skills`, `taste-skill`) have been tried and if a more rigorous automated design-QA pass still feels worth the added trust surface.

---
*Initialized: 2026-04-06*
*Pivoted to web (Next.js) and iOS code removed: 2026-08-27*
*Listings, rental lifecycle, chat, and Stripe Connect (test mode) built: 2026-08-27*
