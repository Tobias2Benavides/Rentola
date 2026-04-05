# Project Research Summary

**Project:** Rentola — Peer-to-Peer Rental Marketplace (iPhone)
**Domain:** iOS marketplace app for physical item rental between strangers
**Researched:** 2026-04-06
**Confidence:** HIGH (stack, architecture, pitfalls); MEDIUM-HIGH (features)

---

## Executive Summary

Rentola is a two-sided marketplace for physical item rental, operating in well-charted territory alongside Airbnb, Fat Llama, and Turo. The recommended build approach is SwiftUI (iOS 16+) with Supabase as the sole backend — covering auth, database, real-time, storage, and proximity search in one platform. The rental lifecycle is inherently relational (a rental links a listing, a lister, a renter, a status, and expiry timestamps), which makes PostgreSQL the correct data model and disqualifies Firebase/Firestore for this domain. The core value loop — renter finds something nearby, requests it in seconds, and tracks rental status live — is achievable in beta without payments, maps, or in-app chat.

The recommended iOS architecture is MVVM with a Coordinator pattern for navigation, using `@Observable` (iOS 17) or `ObservableObject` (iOS 16 fallback). Supabase Realtime drives live rental status updates; APNs (via Supabase Edge Functions) handles push notifications. The full feature set for beta is nine sequential steps from auth through to mutual reviews, with a hard line against in-app payments, map views, instant booking, and chat — each of which adds weeks of scope for zero additional beta signal.

The biggest risks are not technical. App Store rejection from missing UGC moderation infrastructure (a "Report Listing" button is mandatory, not optional) and from premature push-notification permission prompts are both pre-launch hazards that have blocked teams before first submission. The second risk class is data integrity: rental state transitions must be atomic (Supabase RPC or Postgres transactions) and Supabase Row Level Security must be enabled on every table from the start, not retrofitted. The third risk is supply-side cold start — building renter features before seeding 20–50 listings guarantees a failed beta launch regardless of UX quality.

---

## Key Findings

### Recommended Stack

All backend needs are covered by a single Supabase project. Splitting auth, storage, or notifications onto a second platform (Firebase, Cloudinary, FCM) adds vendor surface with no functional gain for a beta targeting iPhone only.

**Core technologies:**
- **SwiftUI (iOS 16+):** Primary UI framework — declarative, Apple-first, correct for all marketplace list/card/detail navigation flows. Do not use UIKit.
- **Supabase (hosted):** Backend-as-a-Service covering PostgreSQL, Auth, Realtime, Storage, and Edge Functions. Preferred over Firebase because the rental lifecycle is relational, not document-based. Portable to any Postgres host post-beta.
- **Supabase Realtime:** Subscribes to Postgres row-level changes — live rental status for both parties, no polling required.
- **PostGIS via Supabase RPC:** Proximity search ("items near me") using `ST_DWithin` and the `<->` distance operator. No maps required in v1 — a list view with distance labels is sufficient.
- **APNs direct (via Supabase Edge Functions):** Push notifications. FCM is a pass-through to APNs on iOS — unnecessary when there is no Android target.
- **Supabase Storage:** Listing and avatar image storage with CDN delivery and on-the-fly resize transforms. No Cloudinary needed in beta.
- **Nuke (LazyImage):** Image caching for listing grids. `AsyncImage` does not reliably cache across view lifecycles; Nuke provides LRU memory + disk cache essential for smooth scrolling.

**Version constraints:** iOS 16.0 minimum deployment target; Swift 5.9+; supabase-swift v2.0+ (current: v2.43); Xcode 15+. Use `@Observable` only if iOS 17 is the minimum — otherwise use `ObservableObject` + `@Published`.

See [STACK.md](STACK.md) for full rationale and SDK setup.

---

### Expected Features

The feature dependency chain is strict: each step unlocks the next. There is no shortcut order.

**Must have — table stakes (beta blockers if missing):**
- Email/password auth + minimal profile (name, city, avatar)
- Multi-photo item listing (title, category, price/day, availability window)
- Browse feed with category filter and distance label
- Rental request flow (date range picker, optional message, summary screen)
- Owner approve / decline with push notification to both parties
- Rental status lifecycle: Requested → Approved → Active → Expiring → Returned
- Both dashboards (renter: my rentals; owner: inbox + listings) with "action required" surfaced at top
- Push notifications for all 8 lifecycle events
- Mutual blind post-rental reviews (star rating + 2 structured dimensions + free text)
- UGC moderation minimum: "Report Listing" button + "Block User" — required by App Store Guideline 1.2

**Should have — differentiators within beta scope:**
- Handoff confirmation by either party (marks rental Active; creates accountability without payments)
- Return confirmation by either party (closes loop, triggers review prompt)
- Expiry countdown label on dashboard cards ("due back tomorrow")
- Pre-permission screen before system push dialog (context-triggered, not on launch)
- City-level fallback if location is denied

**Defer to v2+:**
- In-app payments (Stripe/Apple Pay)
- Map view / geo-clustering
- Instant booking
- In-app messaging / chat
- Advanced search filters (price range, condition, availability date matching)
- ID verification / phone number
- Owner calendar sync (iCal)
- Subscription or pro tiers
- Dispute resolution workflow
- Admin analytics dashboard

See [FEATURES.md](FEATURES.md) for detailed UX specs per feature.

---

### Architecture Approach

MVVM + Coordinator pattern on SwiftUI, with a 4-tab root structure (Browse, My Rentals, Inbox, Profile). Each tab owns a coordinator that holds a `NavigationPath`, enabling push-notification deep links to be dispatched to the correct tab and screen from `AppCoordinator`. One ViewModel per screen; all Supabase interaction lives in service objects, never in Views. The rental state machine is a Swift `RentalStatus` enum with an explicit `allowedTransitions` set; state changes write to Supabase first and update local state only on the confirmed realtime callback (pessimistic, not optimistic).

**Major components:**

1. **AppCoordinator** — auth-state routing (onboarding vs. main app), deep-link dispatch from push notification taps
2. **Per-tab Coordinators** (Browse, MyRentals, Inbox, Profile) — own `NavigationPath`, expose typed `push(Destination)` methods
3. **Feature ViewModels** (one per screen, `@Observable`) — hold screen state, call services, never reference other ViewModels directly
4. **Service Layer** (`SupabaseService`, `AuthService`, `StorageService`, `NotificationService`) — all Supabase SDK calls isolated here; mockable for tests
5. **RentalService (actor)** — validates and executes `RentalStatus` transitions atomically via Supabase RPC; single source of truth for state changes
6. **NetworkMonitor** — NWPathMonitor wrapper; disables write-path buttons when offline; never queue rental requests for deferred send

See [ARCHITECTURE.md](ARCHITECTURE.md) for coordinator skeleton, data models, and Realtime listener patterns.

---

### Critical Pitfalls

1. **Missing UGC moderation → App Store rejection** — "Report Listing" and "Block User" are mandatory under Guideline 1.2 for any app with user-submitted photos and text. Build them before first TestFlight submission, even if the backend is just a mailto link. Explicitly state UGC policy in App Review Notes.

2. **Supabase RLS disabled by default → full data exposure** — Row Level Security is OFF on all new Supabase tables. Any attacker who knows the project URL (readable from the app binary) can read or write all data until RLS is enabled. Write production RLS policies before external beta begins, not after.

3. **Non-atomic rental state transitions → double-booking** — Two simultaneous approval requests for the same item will both succeed if availability and status are written separately. All state transitions must go through a Supabase RPC function (Postgres transaction) that checks and updates atomically. Never trust the client to enforce business rules.

4. **Premature push permission prompt → 60–80% denial** — The system dialog is a one-shot. Apps that show it on first launch see the majority of users deny permanently, silently breaking the entire notification-driven rental loop. Always show a custom pre-prompt screen first, and only trigger the system dialog after the user's first meaningful action (listing published or first request sent).

5. **No supply at beta launch → zero retention** — Seed 20–50 real listings in the launch geography before opening to renters. The renter "aha moment" (finding and requesting a nearby item) is impossible with an empty feed. Gate renter access until minimum listing density exists.

See [PITFALLS.md](PITFALLS.md) for all 16 pitfalls with detection tests and prevention checklists.

---

## Implications for Roadmap

The feature dependency chain from FEATURES.md maps directly to a natural phase structure. Each phase produces a testable, self-contained slice of the product.

### Phase 1: Foundation — Auth, Profile, Navigation Shell
**Rationale:** Nothing else can be built without authenticated users and a working app skeleton. Coordinator-based navigation should be scaffolded here so all subsequent phases drop into it cleanly.
**Delivers:** Working login/signup, minimal profile (name, city, avatar), 4-tab shell with placeholder screens, Supabase client initialized with RLS enabled from day one.
**Addresses:** Auth, profile (FEATURES.md step 1); AppCoordinator + tab coordinators (ARCHITECTURE.md); RLS-from-the-start requirement (PITFALLS.md #3).
**Avoids:** Retrofitting RLS after data exists; navigation debt from inline NavigationLinks.
**Research flag:** Standard patterns — skip phase research.

### Phase 2: Supply Side — Listing Creation
**Rationale:** Supply must exist before any demand feature is useful. The lister experience is also the most technically loaded phase (multi-photo upload, image compression, PostGIS location storage) and should be debugged before any other path depends on listings existing.
**Delivers:** Multi-step listing form (category, title, photos, price/day, availability window), compressed image upload to Supabase Storage, listing stored with PostGIS `geography(POINT)` column, owner "My Listings" screen.
**Addresses:** Listing creation (FEATURES.md step 2); StorageService pattern (ARCHITECTURE.md); image compression before upload (PITFALLS.md #9); UGC moderation minimum on listing form (PITFALLS.md #2).
**Avoids:** Full-resolution image crashes (compress to 1920px max, upload from disk not memory); storing image paths instead of URLs.
**Research flag:** Standard patterns — skip phase research. Verify `putFile(from:)` vs `putData` behavior with supabase-swift Storage SDK.

### Phase 3: Demand Side — Browse and Proximity Search
**Rationale:** Once listings exist, renters need to discover them. Proximity search is a differentiator and must be wired up before the request flow, since browse is the entry point to requesting.
**Delivers:** Browse feed (list view, distance label, category filter), PostGIS `listings_near` RPC function, CoreLocation `WhenInUse` permission (context-triggered, not on launch), city-text fallback if location denied.
**Addresses:** Browse feed (FEATURES.md step 3); PostGIS RPC + CoreLocation (STACK.md); location permission timing (PITFALLS.md #6).
**Avoids:** Map view (deferred to v2); `Always` location permission; requesting location on app launch; `addSnapshotListener` on the browse feed (use `.execute()` one-time fetch with pagination).
**Research flag:** Standard patterns — PostGIS proximity query is fully documented. Verify `CLLocationUpdate.liveUpdates()` async/await API on iOS 16 vs 17.

### Phase 4: Core Transaction — Request, Approve, Decline
**Rationale:** This is the highest-stakes interaction. Must be solid before lifecycle states or notifications are added. Atomic state transitions belong here, not as a later retrofit.
**Delivers:** Rental request flow (date range picker, optional message, summary), owner Inbox tab with approve/decline, Supabase RPC for atomic `pending → approved/declined` transition that simultaneously blocks dates, both-party status visible on dashboards.
**Addresses:** Request flow + approve/decline (FEATURES.md steps 4–5); RentalService actor + atomic transitions (ARCHITECTURE.md); double-booking prevention (PITFALLS.md #4).
**Avoids:** Client-side-only state updates; optimistic local status before server confirmation; non-atomic writes.
**Research flag:** Needs verification — confirm Supabase RPC + Postgres advisory locks or `FOR UPDATE` pattern for preventing double-booking at the database level.

### Phase 5: Lifecycle and Dashboards
**Rationale:** Once transactions exist, both parties need visibility. This phase wires up the full `RentalStatus` state machine, handoff/return confirmations, and the "action required" dashboard pattern.
**Delivers:** Full 5-state lifecycle (Requested → Approved → Active → Expiring → Returned), handoff confirmation by either party, return confirmation by either party, renter and owner dashboards with colored status badges and time-context labels, Supabase Realtime subscriptions scoped to current user.
**Addresses:** Lifecycle states + both dashboards (FEATURES.md steps 6–8); Realtime listener pattern + NetworkMonitor (ARCHITECTURE.md); listener cleanup to avoid billing spikes (PITFALLS.md #10); timezone UTC storage (PITFALLS.md #5).
**Avoids:** Deriving status from dates alone (use stored enum + date context); real-time listeners on browse feed; listener leak on screen dismiss.
**Research flag:** Standard patterns — Supabase Realtime channel scoping is documented.

### Phase 6: Push Notifications
**Rationale:** Notifications are the connective tissue of the rental loop but depend on lifecycle events existing first. This phase is isolated because APNs setup (entitlements, Edge Functions, device token storage) is a distinct workstream.
**Delivers:** All 8 lifecycle notification events, Supabase Edge Function as APNs trigger, device token stored in `device_tokens` table, custom pre-permission screen before system dialog (context-triggered: after first listing publish or first request sent), expiry batching (1 notification for multiple same-day expirations), `pg_cron` for 24h expiry warnings.
**Addresses:** Notification strategy (FEATURES.md step 7); APNs direct + Edge Function trigger (STACK.md); pre-permission screen to prevent 60–80% denial (PITFALLS.md #7); silent push not used as authoritative state (PITFALLS.md #8).
**Avoids:** `requestAuthorization` in `AppDelegate.didFinishLaunchingWithOptions`; silent pushes for state sync; missing `aps-environment` entitlement.
**Research flag:** Needs verification — confirm current Deno-compatible APNs HTTP/2 library in Supabase Edge Functions environment. STACK.md notes MEDIUM confidence on this specific integration.

### Phase 7: Trust Layer — Reviews and App Store Readiness
**Rationale:** Reviews are the trust mechanism that allows the marketplace to self-regulate and convert. App Store submission readiness (Privacy Manifest, UGC moderation, entitlements audit) belongs here as a gate before any external distribution.
**Delivers:** Blind mutual review system (triggered on return confirmation, 7-day window, revealed when both submit or window closes), star rating + 2 structured dimensions + free text per role, average rating on listing card and owner profile, "Report Listing" button on item detail, "Block User" on profile, `PrivacyInfo.xcprivacy` complete, App Review Notes draft.
**Addresses:** Reviews (FEATURES.md step 9); UGC moderation mandatory for App Store (PITFALLS.md #1 and #2); Privacy Manifest requirements (PITFALLS.md #16).
**Avoids:** Review responses, helpful votes, moderation UI — all deferred to v2; building before return confirmation exists.
**Research flag:** Standard patterns — blind review system is well-documented (Airbnb model).

### Phase Ordering Rationale

- **Supply before demand:** Phase 2 (listing creation) precedes Phase 3 (browse) because an empty feed is a failed beta, not a technical issue.
- **Transaction before lifecycle:** Phase 4 (request/approve) must be solid before Phase 5 (lifecycle/dashboards) because lifecycle states are transitions on top of approved rentals.
- **Notifications after lifecycle:** Phase 6 depends on lifecycle events existing and being reliable; adding push before state transitions are atomic creates misleading notifications.
- **Reviews last:** Phase 7 requires completed rentals to test against and anchors the App Store submission gate.

### Research Flags

Needs deeper research during planning:
- **Phase 4 (atomic transitions):** Verify the Supabase RPC + Postgres locking pattern that prevents double-booking when two approval requests arrive simultaneously.
- **Phase 6 (Edge Function → APNs):** Confirm Deno-compatible APNs library compatibility with current Supabase Edge Functions runtime. STACK.md rates this MEDIUM confidence.

Standard patterns (skip research-phase):
- **Phase 1:** Auth + navigation shell — fully documented by Supabase Swift quickstart and Apple NavigationStack docs.
- **Phase 2:** Listing creation + image upload — well-documented PHPickerViewController and Supabase Storage patterns.
- **Phase 3:** PostGIS proximity — official Supabase docs cover this exact pattern with a code sample.
- **Phase 5:** Realtime listeners — Supabase Realtime channel scoping is documented and matches the Firestore pattern.
- **Phase 7:** Blind reviews — Airbnb model is well-understood; implementation is straightforward Postgres + SwiftUI.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All primary claims verified against official Supabase Swift docs, Apple docs, and active SDK. Single MEDIUM area: Supabase Edge Function + APNs HTTP/2 library — needs verification in Phase 6. |
| Features | MEDIUM-HIGH | Core features cross-referenced across Fat Llama, Airbnb, Turo patterns. Fat Llama direct source returned 402; findings supplemented from secondary sources. Feature ordering and anti-feature list are high confidence. |
| Architecture | HIGH | Primary claims (MVVM + Coordinator, NavigationStack, @Observable, Realtime listeners) verified against Apple official docs and active Swift community authors. Firestore-specific code in ARCHITECTURE.md references Firebase — see conflict note below. |
| Pitfalls | HIGH | App Store guidelines cited from official Apple sources (accessed April 2026). Firebase security exposure verified against Firebase security checklist and independent research. |

**Overall confidence:** HIGH

### Conflicts and Open Questions

**Backend inconsistency between ARCHITECTURE.md and STACK.md:** ARCHITECTURE.md was written with Firebase/Firestore as the backend (references `@DocumentID`, `@ServerTimestamp`, `ListenerRegistration`, FCM tokens on `UserProfile`). STACK.md recommends Supabase. The architectural patterns are directly transferable (MVVM, Coordinator, Realtime listeners, image URL storage), but the data model code samples in ARCHITECTURE.md use FirebaseFirestoreSwift Codable wrappers that do not exist in supabase-swift. During Phase 1, the data models should be rewritten as plain `Codable` structs without Firebase-specific property wrappers. **Decision needed before Phase 1 starts: confirm Supabase as the backend so data models are written once.**

**@Observable iOS version target:** ARCHITECTURE.md recommends `@Observable` (iOS 17) while STACK.md sets iOS 16 as the minimum. These are inconsistent. iOS 16 requires `ObservableObject` + `@Published`. Choosing iOS 17 minimum would allow `@Observable` everywhere and simplify ViewModel code. iOS 17+ covers approximately 87%+ of iPhones as of early 2025. **Decision needed: iOS 16 or iOS 17 minimum deployment target.** Recommendation: target iOS 17 and accept the ~13% exclusion; the `@Observable` DX improvement is meaningful for a small team.

**Payment coordination copy:** FEATURES.md specifies showing "arrange payment directly" reminder copy at approval confirmation. No source confirms this satisfies Apple's Guideline 3.1.3(d) for person-to-person services. This should be validated against App Review before any payment-adjacent language is added to the approval flow.

---

## Sources

### Primary (HIGH confidence)
- [Supabase Swift Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/ios-swiftui) — auth, client setup, Storage
- [Supabase PostGIS docs](https://supabase.com/docs/guides/database/extensions/postgis) — proximity RPC pattern
- [supabase-swift GitHub](https://github.com/supabase/supabase-swift) — SDK version, platform support
- [Apple: NavigationStack](https://developer.apple.com/documentation/swiftui/bringing_robust_navigation_structure_to_your_swiftui_app) — navigation architecture
- [Apple: Migrating to @Observable](https://developer.apple.com/documentation/SwiftUI/Migrating-from-the-observable-object-protocol-to-the-observable-macro) — ViewModel pattern
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — UGC requirements, IAP exemptions
- [Firebase Security Checklist](https://firebase.google.com/support/guides/security-checklist) — security rules pattern (applies equally to Supabase RLS)
- [Core Location docs](https://developer.apple.com/documentation/corelocation) — WhenInUse permission, requestLocation()
- [Nuke GitHub](https://github.com/kean/Nuke) — image caching
- [Airbnb HorizonCalendar](https://github.com/airbnb/HorizonCalendar) — date range picker component

### Secondary (MEDIUM confidence)
- [Supabase vs Firebase comparison — Netclues](https://www.netclues.com/blog/supabase-vs-firebase-baas-comparison-guide)
- [Modern iOS Architecture 2025 — 7span](https://7span.com/blog/mvvm-vs-clean-architecture-vs-tca)
- [P2P rental feature landscape — Shipturtle](https://www.shipturtle.com/blog/peer-to-peer-rental-marketplace)
- [Rental marketplace MVP guide — Greenmoov](https://greenmoov.app/articles/en/build-a-rental-marketplace-step-by-step-complete-2026-mvp-guide-for-airbnblike-platforms/)
- [Cold start problem — Andrew Chen](https://andrewchen.com/how-to-solve-the-cold-start-problem-for-social-products/)
- [iOS push notification permission timing — Medium](https://medium.com/@shobhakartiwari/ios-push-notifications-stop-asking-permission-on-day-one-7a2fb2bbe366)

---

*Research completed: 2026-04-06*
*Ready for roadmap: yes*
