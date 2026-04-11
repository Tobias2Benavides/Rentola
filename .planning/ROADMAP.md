# Rentola — v1 Roadmap

## Milestone: Beta Launch

**Goal:** A working peer-to-peer rental marketplace on the web where anyone can list an item, anyone can find and request it nearby, both parties can track the full rental lifecycle, and completed rentals build trust through reviews — runnable locally and deployable to a custom domain.
**Requirements:** 24 v1 requirements across 4 phases

---

## Phase 1: Foundation

**Goal:** A user can create an account, log in, and land in a working web app shell with navigation in place — the skeleton every subsequent phase drops into.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, PROF-01, PROF-02, PROF-03

**Plans:** 2 plans

Plans:
- [ ] 01-01-PLAN.md — App shell + auth: Next.js project with Tailwind, Supabase client, RLS migration, email/password auth flows (sign up, sign in, forgot password, update password), protected routes
- [ ] 01-02-PLAN.md — Profile: display name, bio, avatar upload to Supabase Storage, profile page, aggregated rating placeholder

**Depends on:** —

**UAT:**
1. Run `npm run dev` → app loads at localhost:3000
2. Sign up with email/password → verification email arrives → account created
3. Log out → log back in → session restored, lands on correct page
4. Trigger "forgot password" → email arrives → password updated → new password logs in
5. Edit display name, write bio, upload avatar → changes persist across page reloads
6. Profile page shows name, bio, avatar, and a rating placeholder

---

## Phase 2: Marketplace Supply and Discovery

**Goal:** A lister can publish an item and a renter can find it nearby — the two sides of the marketplace exist and connect through search before any transaction is possible.

**Requirements:** LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, BROW-01, BROW-02, BROW-03, BROW-04

**Plans:**
- Plan 2.1: Listing creation and management — multi-step listing form (up to 5 photos, title, description, category, price per day + per week, availability date range); images uploaded to Supabase Storage; listing stored with PostGIS `geography(POINT)` column; owner "My Listings" page; edit and delete own listing
- Plan 2.2: Browse and discovery — `listings_near` Supabase RPC using `ST_DWithin`; browser Geolocation API permission prompt on Browse page entry; city-text fallback when location is denied; browse feed as a list sorted by distance with distance label; keyword search and category filter; full item detail page (photo gallery, description, price, owner profile card)

**Depends on:** Phase 1

**UAT:**
1. Create a listing with 3 photos, title, category, price/day, price/week, and availability dates → listing appears in "My Listings"
2. Edit listing title → change persists; delete listing → listing disappears from feed
3. Open Browse page → location permission prompt appears; grant it → feed shows listings sorted by distance
4. Deny location → city input appears; enter city → feed shows listings in that city
5. Search by keyword → matching listings shown; filter by category → only that category shown
6. Tap a listing → detail page shows all photos, full description, price, and owner name with avatar

---

## Phase 3: Rental Transaction and Lifecycle

**Goal:** A renter can request an item, an owner can approve or decline, and both parties can track the rental through its full lifecycle on their respective dashboards — the core rental loop is complete end-to-end.

**Requirements:** REQT-01, REQT-02, REQT-03, LIFE-01, LIFE-02, LIFE-03, DASH-01, DASH-02, DASH-03, DASH-04

**Plans:**
- Plan 3.1: Request and approve — rental request flow from item detail (date range picker, optional message, price summary); request stored via Supabase RPC (atomic `pending → approved / declined` transition); owner Inbox page shows incoming requests with approve/decline actions; in-app status update visible to renter immediately via Supabase Realtime; email notification to renter on approve or decline (Supabase Edge Function → email via Resend)
- Plan 3.2: Lifecycle, dashboards, and expiry notifications — full `RentalStatus` state machine (`pending → approved → active → returned` / `declined` / `cancelled`); handoff confirmation by either party transitions to `active`; return confirmation transitions to `returned`; Supabase Realtime listeners on both dashboard pages; renter dashboard (active rentals, upcoming return dates, rental history); owner dashboard (all listings, pending requests with status badges, active rentals); `pg_cron` job fires Supabase Edge Function 24h before `endDate` → email to both parties

**Depends on:** Phase 2

**UAT:**
1. Send a rental request from item detail with dates and message → request appears in owner Inbox as "Pending"
2. Owner approves request → renter receives email; rental moves to "Approved" on both dashboards
3. Owner declines request → renter receives email; request shows "Declined"
4. Owner confirms handoff → rental moves to "Active" on both dashboards
5. Either party marks returned → rental closes and moves to history
6. With a rental expiring in under 24 hours → both parties receive an email notification
7. Renter dashboard shows active rentals, upcoming return dates, and past history
8. Owner dashboard surfaces pending approvals and return-due items at the top

---

## Phase 4: Trust and Launch Readiness

**Goal:** Completed rentals generate mutual reviews that build trust on profiles; users can report bad actors; the app is deployed to a custom domain and ready for real users.

**Requirements:** TRST-01, TRST-02, TRST-03, TRST-04

**Plans:**
- Plan 4.1: Reviews, moderation, and deployment — blind mutual review system triggered on return confirmation (7-day submission window; revealed when both submit or window closes); star rating + free-text review per role; average rating aggregated on user profile and displayed on listing cards and profile page; "Report User" flow accessible from any user profile; "Block User" action from profile; "Report Listing" button on item detail; deploy to Vercel with custom domain configured

**Depends on:** Phase 3

**UAT:**
1. Complete a rental (both parties confirm return) → both parties receive a review prompt
2. Both submit reviews → reviews become visible on each party's profile; average rating updates
3. Only one party submits within 7 days → that review is revealed after the window closes
4. Open another user's profile → "Report User" button present and submits without crashing
5. Block a user → their listings disappear from browse feed
6. Open item detail → "Report Listing" button present
7. App is live on custom domain and loads correctly in production

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Not started | - |
| 2. Marketplace Supply and Discovery | 0/2 | Not started | - |
| 3. Rental Transaction and Lifecycle | 0/2 | Not started | - |
| 4. Trust and Launch Readiness | 0/1 | Not started | - |

---

## Requirement Coverage

| Requirement | Phase |
|-------------|-------|
| AUTH-01 | Phase 1 |
| AUTH-02 | Phase 1 |
| AUTH-03 | Phase 1 |
| PROF-01 | Phase 1 |
| PROF-02 | Phase 1 |
| PROF-03 | Phase 1 (field) / Phase 4 (populated) |
| LIST-01 | Phase 2 |
| LIST-02 | Phase 2 |
| LIST-03 | Phase 2 |
| LIST-04 | Phase 2 |
| LIST-05 | Phase 2 |
| BROW-01 | Phase 2 |
| BROW-02 | Phase 2 |
| BROW-03 | Phase 2 |
| BROW-04 | Phase 2 |
| REQT-01 | Phase 3 |
| REQT-02 | Phase 3 |
| REQT-03 | Phase 3 |
| LIFE-01 | Phase 3 |
| LIFE-02 | Phase 3 |
| LIFE-03 | Phase 3 |
| DASH-01 | Phase 3 |
| DASH-02 | Phase 3 |
| DASH-03 | Phase 3 |
| DASH-04 | Phase 3 |
| TRST-01 | Phase 4 |
| TRST-02 | Phase 4 |
| TRST-03 | Phase 4 |
| TRST-04 | Phase 4 |

**Coverage: 24/24 v1 requirements mapped. No orphans.**

---

*Roadmap created: 2026-04-06*
*Last updated: 2026-04-06 — pivoted to web (Next.js) from iOS native app*
