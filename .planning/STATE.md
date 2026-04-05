# Rentola — Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** The renter finds what they need nearby, requests it in seconds, and always knows the status of what they're renting.
**Current focus:** Ready to plan Phase 1

## Milestone: Beta Launch

**Goal:** Working P2P rental marketplace on iPhone — list, discover, request, lifecycle, dashboards, notifications, reviews — ready for TestFlight.

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Foundation | ○ Pending | 2 |
| 2 | Marketplace Supply and Discovery | ○ Pending | — |
| 3 | Rental Transaction and Lifecycle | ○ Pending | — |
| 4 | Trust and Launch Readiness | ○ Pending | — |

## Stack

- **iOS:** SwiftUI, iOS 17+, MVVM + Coordinator pattern
- **Backend:** Supabase (PostgreSQL + PostGIS, Auth, Storage, Realtime)
- **Push:** APNs via Supabase Edge Functions
- **Images:** Supabase Storage with CDN

## Next Action

Run `/gsd-plan-phase 1` to plan Phase 1: Foundation.

---
*Initialized: 2026-04-06*
