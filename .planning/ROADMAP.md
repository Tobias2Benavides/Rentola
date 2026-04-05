# Rentola — v1 Roadmap

## Milestone: Beta Launch

**Goal:** A working peer-to-peer rental marketplace on iPhone where anyone can list an item, anyone can find and request it nearby, both parties can track the full rental lifecycle, and completed rentals build trust through reviews — ready for TestFlight and App Store submission.
**Requirements:** 24 v1 requirements across 4 phases

---

## Phase 1: Foundation

**Goal:** A user can create an account, log in, and land in a working app shell with tab navigation in place — the skeleton every subsequent phase drops into.

**Requirements:** AUTH-01, AUTH-02, AUTH-03, PROF-01, PROF-02, PROF-03

**Plans:**
- Plan 1.1: App shell + auth — Xcode project, MVVM + Coordinator skeleton (AppCoordinator, 4-tab MainTabCoordinator, per-tab coordinators with placeholder screens), Supabase client initialised, RLS enabled on all tables from day one, email/password sign-up + sign-in + password-reset flow, session persistence via Supabase Auth
- Plan 1.2: Profile — display name, bio, avatar upload to Supabase Storage; profile screen wired into ProfileCoordinator; aggregated rating field on user record (populated in Phase 4, rendered here)

**Depends on:** —

**UAT:**
1. Fresh install → sign-up with email/password → verification email arrives → account created
2. Log out → log back in → session restored, lands in correct tab
3. Trigger "forgot password" → email arrives → password updated → new password logs in
4. Edit display name, write bio, upload avatar → changes persist across app restarts
5. Profile screen visible from Profile tab with name, bio, avatar, and a rating placeholder

---

## Phase 2: Marketplace Supply and Discovery

**Goal:** A lister can publish an item and a renter can find it nearby — the two sides of the marketplace exist and connect through search before any transaction is possible.

**Requirements:** LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, BROW-01, BROW-02, BROW-03, BROW-04

**Plans:**
- Plan 2.1: Listing creation and management — multi-step listing form (up to 5 photos via PHPickerViewController, title, description, category, price per day + per week, availability date range); images compressed to 1920px max before upload to Supabase Storage; listing stored with PostGIS `geography(POINT)` column; owner "My Listings" screen in Inbox tab; edit and delete own listing
- Plan 2.2: Browse and discovery — `listings_near` Supabase RPC using `ST_DWithin` / `<->` distance operator; CoreLocation `WhenInUse` permission triggered on Browse tab entry (not on launch); city-text fallback when location is denied; browse feed as a list sorted by distance with distance label; keyword search and category filter; full item detail page (photo gallery with Nuke/LazyImage, description, price, owner profile card)

**Depends on:** Phase 1

**UAT:**
1. Create a listing with 3 photos, title, category, price/day, price/week, and availability dates → listing appears in "My Listings"
2. Edit listing title → change persists; delete listing → listing disappears from feed
3. Open Browse tab → location permission prompt appears; grant it → feed shows listings sorted by distance with km labels
4. Deny location → city input appears; enter city → feed shows listings in that city
5. Search by keyword → matching listings shown; filter by category → only that category shown
6. Tap a listing → detail page shows all photos, full description, price, and owner name with avatar

---

## Phase 3: Rental Transaction and Lifecycle

**Goal:** A renter can request an item, an owner can approve or decline, and both parties can track the rental through its full lifecycle on their respective dashboards — the core rental loop is complete end-to-end.

**Requirements:** REQT-01, REQT-02, REQT-03, LIFE-01, LIFE-02, LIFE-03, DASH-01, DASH-02, DASH-03, DASH-04

**Plans:**
- Plan 3.1: Request and approve — rental request flow from item detail (date range picker, optional message, price summary); request stored via Supabase RPC (atomic `pending → approved / declined` transition with `FOR UPDATE` lock to prevent double-booking); owner Inbox tab shows incoming requests with approve/decline actions; in-app status update visible to renter immediately via Supabase Realtime channel subscription; push notification to renter on approve or decline (device token stored in `device_tokens` table; Supabase Edge Function → APNs HTTP/2); custom pre-permission screen shown before system push dialog, triggered after first listing publish or first request sent
- Plan 3.2: Lifecycle, dashboards, and expiry notifications — full `RentalStatus` state machine (`pending → approved → active → returned` / `declined` / `cancelled`); handoff confirmation by either party transitions to `active`; return confirmation by either party transitions to `returned`; Supabase Realtime listeners scoped to current user on both dashboard screens; renter dashboard (active rentals, rental history, upcoming return dates); owner dashboard (all listings, pending requests with status badges, active rentals); pending action items surfaced at top; `isExpiringSoon` computed from `endDate` within 24 hours; `pg_cron` job fires Supabase Edge Function 24h before `endDate` → push notification to both parties; NetworkMonitor disables write-path buttons when offline

**Depends on:** Phase 2

**UAT:**
1. Send a rental request from item detail with dates and message → request appears in owner Inbox as "Pending"
2. Owner approves request → renter receives push notification; rental moves to "Approved" on both dashboards
3. Owner declines request → renter receives push notification; request shows "Declined" with no further actions
4. Owner confirms handoff → rental moves to "Active" on both dashboards
5. Either party marks returned → rental closes and moves to history; "Returned" status visible to both
6. With a rental expiring in under 24 hours → both parties receive a push notification warning
7. Renter dashboard shows active rentals, upcoming return dates, and past history with correct statuses
8. Owner dashboard surfaces pending approvals and return-due items at the top
9. Go offline → submit buttons disable with offline indicator; reconnect → buttons re-enable

---

## Phase 4: Trust and Launch Readiness

**Goal:** Completed rentals generate mutual reviews that build trust on profiles; users can report and block bad actors; the app satisfies App Store submission requirements and is ready for TestFlight.

**Requirements:** TRST-01, TRST-02, TRST-03, TRST-04

**Plans:**
- Plan 4.1: Reviews, moderation, and App Store gate — blind mutual review system triggered on return confirmation (7-day submission window; revealed when both submit or window closes); star rating + free-text review per role (asRenter / asOwner); average rating aggregated on user profile record and displayed on listing cards and the profile screen (satisfying PROF-03); "Report User" flow accessible from any user profile (writes to moderation table; required by App Store Guideline 1.2); "Block User" action from profile (prevents further contact, hides listings from blocked user); "Report Listing" button on item detail; `PrivacyInfo.xcprivacy` completed; App Review Notes drafted covering UGC moderation, payment-outside-app model, and location usage

**Depends on:** Phase 3

**UAT:**
1. Complete a rental (both parties confirm return) → both parties receive a review prompt within the app
2. Both submit reviews → reviews become visible on each party's profile; average rating updates on the listing card
3. Only one party submits within 7 days → that review is revealed after the window closes; no review shown if neither submits
4. Open another user's profile → "Report User" button present and submits without crashing
5. Block a user → their listings disappear from browse feed; they no longer appear in inbox
6. Open item detail → "Report Listing" button present
7. Build passes App Store validation with `PrivacyInfo.xcprivacy` and no missing entitlements; TestFlight build uploads successfully

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

## Build Order Rationale

- **Auth before everything:** No feature is buildable without authenticated users and a working navigation shell.
- **Listings before browse:** An empty browse feed is a failed beta, not a UX problem. Supply must exist before demand is exposed.
- **Browse before request:** The request flow is entered from a listing detail page — that page depends on browse being wired up.
- **Request/approve before lifecycle:** Lifecycle states are transitions on top of approved rentals. The state machine has nothing to operate on until a rental exists.
- **Lifecycle before dashboards:** Dashboards display lifecycle state — they are UI over the state machine, not standalone.
- **Push notifications in Phase 3:** Notifications depend on both the state machine (events to fire on) and the coordinator shell (deep-link dispatch). Both are in place by Phase 3.
- **Reviews last:** Reviews require at least one completed rental to test against and are the final gate before App Store submission.

---

*Roadmap created: 2026-04-06*
*Last updated: 2026-04-06 after initial creation*
