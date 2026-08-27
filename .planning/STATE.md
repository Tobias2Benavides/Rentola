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

- **Phase:** 01-foundation
- **Current Plan:** 2 of 2
- **Stopped At:** Web app shell shipped — auth (sign up/in, forgot/update password) and profile (edit + avatar upload) work end-to-end against Supabase; Browse and Dashboard pages exist only as "coming in Phase 2/3" placeholders
- **Last session:** 2026-04-11

## Milestone: Beta Launch

**Goal:** Working P2P rental marketplace on the web — list, discover, request, lifecycle, dashboards, notifications, reviews — deployable to a custom domain.

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Foundation | In Progress (auth + profile done; browse/dashboard placeholders only) | 2 |
| 2 | Marketplace Supply and Discovery | Pending | — |
| 3 | Rental Transaction and Lifecycle | Pending | — |
| 4 | Trust and Launch Readiness | Pending | — |

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

## Next Action

Build Phase 2 (Marketplace Supply and Discovery): listing creation form + image upload, and the Browse page's `listings_near` proximity search — replacing the current placeholder pages.

---
*Initialized: 2026-04-06*
*Pivoted to web (Next.js) and iOS code removed: 2026-08-27*
