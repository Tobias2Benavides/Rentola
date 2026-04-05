# Technology Stack

**Project:** Rentola — Peer-to-Peer Rental Marketplace (iOS)
**Researched:** 2026-04-06
**Scope:** Beta, iPhone-only, email/password auth, no in-app payments

---

## Recommended Stack

### Summary Table

| Layer | Technology | Version |
|-------|-----------|---------|
| iOS UI Framework | SwiftUI | iOS 16+ target |
| Backend-as-a-Service | Supabase | v2 (supabase-swift v2.43+) |
| Database | PostgreSQL via Supabase | — |
| Realtime | Supabase Realtime | — |
| Auth | Supabase Auth | — |
| Image Storage | Supabase Storage | — |
| Push Notifications | APNs (direct, via UserNotifications) | — |
| Location / Proximity | CoreLocation + PostGIS (Supabase RPC) | iOS 16+ |

---

## 1. iOS Framework: SwiftUI

**Recommendation: SwiftUI, targeting iOS 16 minimum.**

SwiftUI is the unambiguous choice for a new project in 2025-2026. Apple's own tooling investment — SwiftData, NavigationStack, async/await integration — is entirely SwiftUI-first. UIKit receives maintenance only.

- ~70% of new iOS apps started in 2024-2025 use SwiftUI as primary framework (up from 40% in 2023).
- UIKit remains dominant in enterprise and legacy codebases but is the wrong starting point for a greenfield consumer app.
- SwiftUI's declarative style maps directly to marketplace list/card/detail navigation flows (browse items, item detail, booking form, profile).

**Version constraint: iOS 16 minimum.**
iOS 17 brought NavigationStack refinements and the `@Observable` macro, but targeting iOS 16 is the pragmatic beta call. As of January 2025, iOS 18 is on 68% of all iPhones and iOS 17+ accounts for ~87%. iOS 16+ covers essentially the entire addressable beta audience. Avoid iOS 15 because NavigationStack (iOS 16) is too valuable to give up for a marketplace's multi-level navigation.

**Do not use UIKit.** It adds friction with no benefit for this feature set. If you hit a specific UIKit-only edge case (custom transition, AVFoundation camera sheet), use `UIViewControllerRepresentable` as a bridge for that one view only.

---

## 2. Backend: Supabase

**Recommendation: Supabase (hosted), not Firebase, not a custom backend.**

For a small team building a beta with real-time rental status, image storage, auth, and proximity queries, Supabase covers every requirement on one platform with a single consistent SDK.

### Why Supabase over Firebase

| Concern | Supabase | Firebase |
|---------|---------|---------|
| Data model | PostgreSQL — relational, queryable, JOIN-able | Firestore — document/NoSQL, awkward for relational rental state |
| Rental lifecycle queries | SQL: `SELECT * FROM rentals WHERE status = 'active' AND expires_at < now()` | Requires Cloud Functions or multiple Firestore queries |
| Proximity search | PostGIS extension built in — `<->` distance operator | No native geo, requires external service or Firestore workarounds |
| Realtime | Built on Postgres logical replication — subscribe to row changes | Firestore listeners (mature, but opinionated) |
| Vendor lock-in | PostgreSQL — portable to any Postgres host (Railway, Fly.io, RDS) | Proprietary — migration is a major rewrite |
| Pricing predictability | $25/month Pro tier — flat and generous | Read/write-based billing — unpredictable under burst usage |
| iOS Swift SDK | Official, actively maintained, v2.43 (March 2026) | Official, mature |

**The rental lifecycle is inherently relational.** A rental has a listing, a lister, a renter, a status (`pending`, `active`, `completed`, `cancelled`), and an `expires_at` timestamp. Modeling this in Firestore's NoSQL document hierarchy creates painful denormalization. PostgreSQL handles it trivially.

### Supabase Swift SDK

Install via Swift Package Manager:
```
https://github.com/supabase/supabase-swift
```

Minimum iOS deployment: iOS 13.0+. Current version: 2.43.0 (March 2026, actively maintained).

Include only the products you need: `Supabase`, `Auth`, `Storage`, `Realtime`, `Functions`.

### Realtime Rental Status

Supabase Realtime subscribes to PostgreSQL row-level changes. A rental status change (`pending` → `active`) fires a WebSocket event to subscribed clients with no polling. This is the correct approach for showing live booking state changes to both renter and lister.

```swift
// Subscribe to rental status changes for the current user
supabase.channel("rentals")
  .on(.postgres_changes, table: "rentals", filter: "renter_id=eq.\(userId)") { payload in
    // update local state
  }
  .subscribe()
```

**Confidence: HIGH** — official Swift SDK documentation confirms this API.

---

## 3. Push Notifications: APNs Direct (via UserNotifications)

**Recommendation: APNs directly, with Supabase Edge Functions as the trigger.**

For a beta that is iPhone-only, adding Firebase Cloud Messaging just to wrap APNs is unnecessary complexity. FCM exists to abstract over APNs + FCM Android in one API — when there is no Android target, the abstraction layer adds zero value.

### Direct APNs Setup

1. Enable Push Notifications capability in Xcode.
2. Register for notifications using `UNUserNotificationCenter` and `UIApplication.registerForRemoteNotifications()`.
3. Send the device token to your Supabase backend (store in a `device_tokens` table).
4. Trigger notifications server-side from a **Supabase Edge Function** (Deno/TypeScript) using the APNs HTTP/2 API or a thin Node library like `apns2`.

### Why not FCM

- FCM on iOS is a pass-through to APNs — you are adding a Google dependency and an extra network hop for zero functional gain on an iPhone-only app.
- FCM setup requires uploading APNs certificates to Google, creating a Firebase project, and adding the Firebase SDK — all unnecessary.
- Direct APNs has marginally lower delivery latency because it eliminates the FCM intermediary.

### Push notification triggers for Rentola

| Event | Trigger point |
|-------|---------------|
| Rental request received | When renter inserts a rental row — Supabase DB webhook → Edge Function → APNs |
| Rental approved/declined | When lister updates rental status → Edge Function → APNs |
| Rental expiry warning | Supabase cron job (pg_cron) 24h before `expires_at` → Edge Function → APNs |
| Review request | Post-completion status change → Edge Function → APNs |

**Confidence: HIGH** for APNs setup; MEDIUM for Supabase Edge Function + APNs pattern (well-documented pattern, but verify current APNs HTTP/2 library compatibility with Deno).

---

## 4. Image Storage: Supabase Storage

**Recommendation: Supabase Storage. Do not add Cloudinary or S3 for a beta.**

Supabase Storage is backed by a global CDN (285+ cities), supports on-the-fly image transformations (resize, compress), enforces Row-Level Security from the same Postgres RLS policies that protect the rest of your data, and is included in your existing Supabase project. No separate account, no separate credential management.

### Key capabilities relevant to Rentola

- **Signed URLs** — generate time-limited URLs for private listing images before a rental is confirmed, or for profile pictures. One line of Swift: `supabase.storage.from("listings").createSignedURL(...)`.
- **Image transformation via URL params** — request a 400px thumbnail without storing a separate file: append `?width=400&quality=80` to the public URL. The CDN caches the transformed result.
- **RLS on buckets** — a bucket policy can enforce that only the listing owner can delete/replace images, matching your rental data ownership model.

### When to consider Cloudinary instead

Cloudinary's value is advanced media operations: AI auto-cropping, face detection, video transcoding, watermarking. Rentola does not need any of these for a beta. Cloudinary also adds a separate vendor relationship and separate billing. Revisit only if you need video listings in a later milestone.

### Storage structure

```
listings/
  {listing_id}/
    {uuid}.jpg        ← primary image
    {uuid}-thumb.jpg  ← optional; or use transform URL params
profiles/
  {user_id}/
    avatar.jpg
```

**Confidence: HIGH** — Supabase Storage Swift API is documented with upload, signed URL, and transform examples.

---

## 5. Auth: Supabase Auth

**Recommendation: Supabase Auth with email/password. Do not introduce Firebase Auth alongside Supabase.**

Since the database, storage, and realtime are all on Supabase, using Supabase Auth keeps all Row-Level Security (RLS) policies coherent — the `auth.uid()` function in Postgres policies automatically matches the authenticated user from Supabase Auth JWTs. Splitting auth (Firebase) from data (Supabase) forces manual token bridging and breaks RLS.

### Email/password flow in Swift

```swift
// Sign up
try await supabase.auth.signUp(email: email, password: password)

// Sign in
try await supabase.auth.signIn(email: email, password: password)

// Observe session state
for await (event, session) in supabase.auth.authStateChanges {
  // update app state
}
```

PKCE flow is the default for the Swift SDK — this is correct for native apps and requires no additional configuration.

### Email verification

On hosted Supabase projects, email verification is enabled by default. For beta, you have two options:
- Keep it on — cleaner user base, prevents throwaway accounts.
- Disable it in the Supabase dashboard during early testing — faster onboarding for testers.

Recommendation: disable for closed beta, re-enable before public launch.

### Version constraints

Supabase Auth is a hosted service — no version to pin. The Swift SDK (v2.43+) wraps it with a stable API. No breaking changes expected in the auth surface between current SDK and iOS 16+ targets.

**Confidence: HIGH** — official Supabase Swift documentation covers this flow completely.

---

## 6. Local Search / Proximity: CoreLocation + PostGIS

**Recommendation: CoreLocation on-device for coordinate acquisition; PostGIS `<->` operator server-side for radius filtering. No maps required in v1.**

A "items near me" feature for v1 does not require MapKit or a visible map. The flow is:

1. Request `when-in-use` location permission via `CoreLocation`.
2. Get a one-time coordinate (`CLLocationManager.requestLocation()`).
3. Send `latitude` and `longitude` to a Supabase RPC call (PostgreSQL function).
4. Server returns listings ordered by distance, filtered to a configurable radius (e.g. 50km default).

### Supabase PostGIS setup

PostGIS is a first-class Supabase extension, enabled with one SQL command:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Add a `location` column to the `listings` table:

```sql
ALTER TABLE listings
  ADD COLUMN location geography(POINT);
```

Create a distance-query function callable via Supabase RPC:

```sql
CREATE OR REPLACE FUNCTION listings_near(lat float, lng float, radius_km float)
RETURNS SETOF listings AS $$
  SELECT * FROM listings
  WHERE ST_DWithin(
    location,
    ST_MakePoint(lng, lat)::geography,
    radius_km * 1000
  )
  ORDER BY location <-> ST_MakePoint(lng, lat)::geography
  LIMIT 50;
$$ LANGUAGE sql;
```

Call from Swift:

```swift
let nearby: [Listing] = try await supabase
  .rpc("listings_near", params: ["lat": lat, "lng": lng, "radius_km": 50])
  .execute()
  .value
```

### Location permission strategy

- Request `WhenInUse` only — do not request `Always` authorization for a browse-and-search use case.
- Use `requestLocation()` (single fix) rather than `startUpdatingLocation()` (continuous). Cheaper on battery.
- For users who deny location, fall back to a city-level text filter (a simple `city` string column on listings).
- iOS 16+ supports `CLLocationManager` with async/await via `CLLocationUpdate.liveUpdates()` for Swift concurrency — use this over the legacy delegate pattern.

### What "v1 proximity" does NOT need

- MapKit or any visible map view.
- Reverse geocoding (not needed for distance-based browse).
- Background location tracking.
- iBeacon or geofencing (those are for physical proximity to a device, not to listed items).

**Confidence: HIGH** for CoreLocation API; HIGH for PostGIS with Supabase (official Supabase docs cover this exact pattern).

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| UI Framework | SwiftUI | UIKit | UIKit is maintenance-mode; higher boilerplate for no gain |
| Backend | Supabase | Firebase | NoSQL mismatch for relational rental lifecycle; proprietary lock-in |
| Backend | Supabase | Custom Node/Rails | Too much infrastructure to maintain for a beta team |
| Push Notifications | APNs direct | FCM | FCM wraps APNs on iOS — unnecessary intermediary when iPhone-only |
| Image Storage | Supabase Storage | Cloudinary | Cloudinary's advanced transforms unused in v1; extra vendor |
| Image Storage | Supabase Storage | AWS S3 | Correct tool at scale, but requires separate auth, policies, and CDN config |
| Auth | Supabase Auth | Firebase Auth | Would split auth context from Supabase RLS — breaks row-level security |
| Auth | Supabase Auth | Custom JWT | Never build auth from scratch; no justification for beta |
| Proximity | PostGIS RPC | Algolia GeoSearch | Algolia adds cost and a separate index sync; PostGIS is built into Supabase |

---

## Installation Reference

### Swift Package Manager

In Xcode: File > Add Package Dependencies

```
https://github.com/supabase/supabase-swift
```

Products to add: `Supabase` (umbrella), or individually: `Auth`, `Storage`, `Realtime`, `PostgREST`.

### Supabase client initialization (AppDelegate or @main App struct)

```swift
import Supabase

let supabase = SupabaseClient(
  supabaseURL: URL(string: "https://<project>.supabase.co")!,
  supabaseKey: "<anon-public-key>"
)
```

The anon key is safe to ship in the app binary — Supabase RLS policies enforce data access server-side.

### Xcode capabilities required

- Push Notifications
- Background Modes > Remote notifications
- Location (When In Use Usage Description in Info.plist)

---

## Version Constraints Summary

| Technology | Minimum Version | Notes |
|-----------|----------------|-------|
| iOS deployment target | 16.0 | NavigationStack, modern async/await |
| Swift | 5.9 | Required for `@Observable` macro if used |
| supabase-swift | 2.0+ (current 2.43) | Actively maintained, weekly releases |
| Xcode | 15+ | Required for Swift 5.9 and iOS 16 SDK |
| Supabase PostGIS | Any (extension toggle) | Enable in Supabase dashboard, no version pin |

---

## Sources

- [SwiftUI vs UIKit in 2025: Which Should You Choose? — VoFox Solutions](https://vofoxsolutions.com/swiftui-vs-uikit-2025)
- [SwiftUI vs UIKit — Hacking with Swift](https://www.hackingwithswift.com/quick-start/swiftui/answering-the-big-question-should-you-learn-swiftui-uikit-or-both)
- [Supabase vs Firebase 2025 Guide for Mobile Apps — Netclues](https://www.netclues.com/blog/supabase-vs-firebase-baas-comparison-guide)
- [Supabase vs Firebase: Choosing the Right Backend — Jake Prins](https://www.jakeprins.com/blog/supabase-vs-firebase-2024)
- [Supabase vs Firebase for Startups 2025 — Lanex](https://lanex.au/blog/supabase-vs-firebase-the-ultimate-guide-2025/)
- [FCM vs APNs — Vikram Kumar, Medium](https://vikramios.medium.com/fcm-vs-apns-410f8ed526b6)
- [Get started with Firebase Cloud Messaging in Apple platform apps — Firebase Docs](https://firebase.google.com/docs/cloud-messaging/ios/get-started)
- [Use Supabase with iOS and SwiftUI — Supabase Docs](https://supabase.com/docs/guides/getting-started/quickstarts/ios-swiftui)
- [supabase-swift GitHub — SDK version and platform support](https://github.com/supabase/supabase-swift)
- [Password-based Auth — Supabase Docs](https://supabase.com/docs/guides/auth/passwords)
- [PostGIS: Geo queries — Supabase Docs](https://supabase.com/docs/guides/database/extensions/postgis)
- [Supabase Storage Image Transformations — Supabase Docs](https://supabase.com/docs/guides/storage/serving/image-transformations)
- [iOS 18 hits 68% adoption — TechCrunch, January 2025](https://techcrunch.com/2025/01/24/ios-18-hits-68-adoption-across-iphones-per-new-apple-figures/)
- [Core Location — Apple Developer Documentation](https://developer.apple.com/documentation/corelocation)
- [Leveraging Supabase and PostgreSQL for Distance-Based Filtering — blog.mansueli.com](https://blog.mansueli.com/leveraging-supabase-and-postgresql-for-distance-based-filtering-and-location-data-retrieval)
