# Domain Pitfalls: Rentola — Peer-to-Peer Rental Marketplace iOS App

**Domain:** Peer-to-peer rental marketplace (iOS, SwiftUI, Firebase/Supabase backend)
**Researched:** 2026-04-06
**Scope:** Beta — list items, browse, request rental, approve, lifecycle management, push notifications, dashboards, ratings. No in-app payments.

---

## Critical Pitfalls

Mistakes that cause App Store rejection, rewrites, or broken trust with early users.

---

### Pitfall 1: Triggering In-App Purchase Requirements with Digital Services

**Severity:** HIGH

**What goes wrong:**
Rentola facilitates the rental of physical goods (bikes, cameras, tools, etc.). This is explicitly exempt from Apple's in-app purchase (IAP) requirement under Guideline 3.1.1 — physical goods and services consumed outside the app do not require IAP. However, the moment Rentola introduces any digital-only transaction — a "premium listing boost," a paid subscription for extra features, or a one-to-many service layer — Apple will require IAP and take 15–30% of revenue. Even labeling something ambiguously can trigger reviewer scrutiny.

**Why it happens:**
Developers misread the guideline or add a "pro" tier during beta without realizing it crosses the physical/digital boundary. Reviewers also apply Guideline 3.1.3(d): person-to-person real-time services (one renter, one lender) may use external payment; one-to-many services must use IAP.

**Consequences:**
App rejection, forced architecture change post-launch, revenue share obligation, potential removal from the App Store.

**Prevention:**
- Keep Rentola strictly as a physical-goods rental facilitator for beta — no digital upsells, no premium tiers, no paid visibility boosts.
- When payments are added post-beta, use Stripe or similar for the physical transaction flow (outside IAP). Do not collect money inside the app for digital goods/features.
- In App Review Notes, explicitly state: "This app facilitates peer-to-peer rental of physical goods. No digital goods or services are sold within the app."
- Review Guideline 3.1.1 and 3.1.3(d) before adding any new monetization feature.

**Detection:**
Review rejection citing Guideline 3.1.1 or 3.1.3. Monitor App Review communications closely on first submission and any update that touches "value exchange" language.

---

### Pitfall 2: User-Generated Content Without Moderation Infrastructure

**Severity:** HIGH

**What goes wrong:**
Listing photos, item descriptions, and user reviews are all UGC. Apple's Guideline 1.2 requires that apps with UGC include: a mechanism to filter objectionable material, a way to report offensive content with timely responses, and the ability to block abusive users. Since the 2025 update, Guideline 1.2.1 also requires age-restriction mechanisms for content exceeding the app's rating. Missing any of these is an immediate rejection.

**Why it happens:**
Teams focused on the rental flow skip moderation features, assuming they are only required for social or messaging apps. Apple reviewers test UGC paths actively — they create a listing with borderline content and look for a report button.

**Consequences:**
App Store rejection on first submission. Fixing this after submission adds delay. Post-launch, it also creates liability for illegal listings (stolen goods, weapons).

**Prevention:**
- Add a "Report Listing" button to every item detail screen from day one — even if the backend simply emails the report to the team initially.
- Add a "Block User" option in user profiles.
- Add a content moderation note in App Review Notes explaining the process.
- In listing creation, add a short Terms of Service acknowledgement ("I confirm this item is legally mine to rent").
- Include a basic banned-words check or manual review queue for listing titles/descriptions before they go live.

**Detection:**
First submission rejection citing Guideline 1.2. Pre-submission: audit every screen that accepts user text or photos for a report/flag affordance.

---

### Pitfall 3: Firebase Security Rules Left in Test Mode

**Severity:** HIGH

**What goes wrong:**
Firebase initializes Firestore in "test mode" — `.read: true, .write: true` for 30 days. Developers ship to beta with these rules intact, sometimes for months. Security researchers have demonstrated that approximately 150 Firebase endpoints in top-ranked apps were accessible without authentication in 2025. In a rental marketplace, this exposes: user home addresses, rental history, ID documents if collected, and the ability for anyone to approve or cancel bookings by writing directly to Firestore.

**Why it happens:**
Test mode feels safe during development. The 30-day warning email gets missed. Rules feel like an "after launch" task.

**Consequences:**
Full database read/write access for any attacker who knows the project ID (discoverable in the iOS binary). Personal data breach, GDPR/regulatory liability, destroyed user trust.

**Prevention:**
- Write production security rules before TestFlight beta begins — not after.
- Every Firestore document should require `auth != null` at minimum.
- Rental requests, approvals, and user profiles should additionally verify `auth.uid == resource.data.ownerId`.
- Use Firebase Rules Playground to validate every rule before deploying.
- Run Firebase's security checklist: https://firebase.google.com/support/guides/security-checklist before any external beta.
- For Supabase: ensure Row Level Security (RLS) is enabled on every table from the start — it is OFF by default.

**Detection:**
Run Firebase's rule validator. Use a test account to attempt reading another user's private data via the REST API — if it succeeds, rules are wrong.

---

### Pitfall 4: Rental State Machine Without Atomic Transitions

**Severity:** HIGH

**What goes wrong:**
A rental flows through states: `available → requested → approved → active → returned → completed` (with `cancelled` and `disputed` branches). Without atomic writes and server-side validation, race conditions produce:
- Double-booking: two renters request simultaneously, both get approved because approval checks availability separately from the write.
- Stuck rentals: a rental stays `active` forever because the "return confirmed" notification was dropped or the renter never tapped "return."
- Phantom requests: a cancelled request still shows as pending in the lender's dashboard because the client cached the old state.

**Why it happens:**
State transitions are implemented as two separate writes (update rental + update item availability) rather than a single atomic transaction. Client-side state management diverges from server state.

**Consequences:**
Two renters show up for the same item. Lender is never paid (in future payment phase). Dashboard becomes unreliable, eroding beta user trust.

**Prevention:**
- Model the entire rental lifecycle as a state machine from the start. Define all valid transitions explicitly (no jumping from `requested` to `completed`).
- Use Firestore transactions (`runTransaction`) or Supabase RPC functions to ensure approval atomically sets rental status AND marks item unavailable in one operation.
- Implement server-side Cloud Functions (Firebase) or Edge Functions (Supabase) to validate state transitions — never trust the client to enforce business rules.
- Store `statusUpdatedAt` on every transition for debugging and expiry detection.
- Add a scheduled function that detects rentals stuck in `active` past their end date and flags them for manual resolution.

**Detection:**
Write an integration test that fires two simultaneous approval requests for the same item. If both succeed, the state machine is broken.

---

### Pitfall 5: Timezone Bugs in Rental Period Calculations

**Severity:** HIGH

**What goes wrong:**
A lender in Copenhagen lists an item available until "Sunday 6pm." A renter in London books it. The app stores the end time as a raw timestamp without timezone context. The renter sees "6pm" (interpreted as their local time) but the lender expects 6pm their time. The booking shows as 1 hour late/early. At scale, this breaks availability calendars for all users.

**Why it happens:**
Dates are stored as local device time or as a Unix timestamp without recording which timezone the lender intended. The frontend displays the timestamp in the device's current timezone without conversion context.

**Consequences:**
Availability conflicts, angry users, impossible-to-debug support tickets, broken calendar blocks.

**Prevention:**
- Always store rental start/end as UTC timestamps in the database — never local time.
- Always store and display the lender's timezone alongside the listing's availability times.
- When displaying times to the renter, show BOTH their local time and the lender's local time: "Returns Sunday 6pm CET (5pm your time)."
- Use Swift's `Calendar` with explicit `TimeZone` parameters — never use `.current` for business logic dates.
- For iOS date pickers, force explicit timezone selection or infer from the listing's geocoordinates.

**Detection:**
Test the full booking flow with simulator timezone set to a different zone than the test listing was created in. If the displayed times diverge, timezone handling is wrong.

---

## Moderate Pitfalls

Mistakes that cause significant user frustration or wasted engineering time.

---

### Pitfall 6: Asking for Location Permission Too Early or Too Broadly

**Severity:** MEDIUM

**What goes wrong:**
Apps request `Always` location permission (background location) when they only need `When In Use` for map browsing. Or they request location permission on the first screen before the user understands why. Apple reviewers actively test permission flows and reject apps where the purpose string is vague ("for app functionality") or where `Always` is requested without a clear background use case. Apple rejected 12% of App Store submissions in Q1 2025 for Privacy Manifest violations.

**Why it happens:**
Copy-pasting boilerplate location code that requests the broadest permission. Forgetting to write specific purpose strings in Info.plist.

**Consequences:**
App Store rejection, or users denying permission permanently (iOS shows a one-time prompt — denied means denied until the user manually goes to Settings).

**Prevention:**
- Use `requestWhenInUseAuthorization()` only. Rentola does not need background location.
- Consider `CLLocationButton` (iOS 15+) for one-time location use in search — requires no Info.plist key and no upfront permission dialog.
- Request location only when the user taps "Find items near me" — not on app launch or signup.
- Write specific purpose strings: "Rentola uses your location to show rental items near you" (not "for functionality").
- Add `NSLocationWhenInUseUsageDescription` to the Privacy Manifest (`PrivacyInfo.xcprivacy`) — required for all apps since 2024.
- Never request location on first launch; wait for a clearly location-driven user action.

**Detection:**
Submit a test build and check that no location permission dialog appears until the user explicitly triggers a location-dependent feature. Review App Store Connect for privacy manifest warnings.

---

### Pitfall 7: Push Notification Permission Destroyed by Premature Prompting

**Severity:** MEDIUM

**What goes wrong:**
The system permission dialog for push notifications is shown once. If the user taps "Don't Allow," they cannot be re-prompted — only a manual trip to Settings can recover it. Apps that show this dialog on first launch (before the user has any reason to care) see denial rates of 60–80%. For a rental marketplace, push notifications are critical for rental request alerts and approvals.

**Why it happens:**
Calling `requestAuthorization` inside `AppDelegate.didFinishLaunchingWithOptions` is the default pattern in most tutorials and boilerplate code.

**Consequences:**
Most beta users never receive rental request notifications. The core loop (request → notify lender → approve → notify renter) breaks silently.

**Prevention:**
- Never request notification permission on launch. Request it contextually: after a user's first listing is published ("Get notified when someone requests this item"), or after a first rental request is submitted.
- Show a pre-prompt screen first: "Rentola needs to notify you when someone requests your item. Enable notifications?" — only call the system dialog after the user taps "Yes."
- Push notifications require an `AppDelegate` even in a SwiftUI-only app. Use `UIApplicationDelegateAdaptor`.
- Verify the `aps-environment` entitlement is set to `production` in the distribution provisioning profile — missing this entitlement is a common App Store submission warning (ITMS-90078).
- Test on a physical device, not Simulator, for all notification flows.

**Detection:**
Check notification opt-in rate in analytics during TestFlight. Below 40% opt-in suggests the prompt is appearing too early.

---

### Pitfall 8: Silent Push Notifications Treated as Guaranteed Delivery

**Severity:** MEDIUM

**What goes wrong:**
Silent pushes (background refresh, content-available: 1) are used to sync rental state updates. The app logic assumes "if I sent a silent push, the client state is now updated." iOS can throttle, delay, or drop silent pushes in Low Power Mode, when background budget is exhausted, or during poor network conditions. Delivery to APNs does not guarantee execution on the device.

**Why it happens:**
Silent pushes work reliably in development on a plugged-in device. The fragility only surfaces in real-world usage with battery-constrained devices.

**Consequences:**
Rental statuses displayed in the app are stale. A lender's dashboard shows a pending request that was already approved hours ago. Users lose trust in the app's reliability.

**Prevention:**
- Use silent pushes for gentle background pre-fetching only, not as authoritative state updates.
- Always refresh data from the server on app foreground (`sceneDidBecomeActive`).
- Use visible push notifications (not silent) for all rental lifecycle events that require user action.
- Design the app to pull fresh state on every meaningful navigation event (entering the dashboard, opening a rental detail) rather than relying on pushed state.
- Use APNs priority 5 (not 10) for silent pushes — priority 10 is for visible alerts only.

**Detection:**
Enable Low Power Mode on a test device and verify that all rental state changes still appear correctly within 30 seconds of the user opening the app.

---

### Pitfall 9: Photo Upload Crashes from Full-Resolution PHPicker Images

**Severity:** MEDIUM

**What goes wrong:**
`PHPickerViewController` returns the full-resolution image from the photo library. An iPhone 15 Pro captures 48MP photos (~192MB when fully decoded in memory). Loading multiple full-resolution images simultaneously (Rentola allows multiple listing photos) causes memory pressure warnings and crashes, especially on older devices with 3–4GB RAM.

Firebase Storage's `dataWithMaxSize:completion:` method also loads the entire file into memory — calling this with a raw full-res image will crash on low-memory devices.

**Why it happens:**
Passing the raw `UIImage` from `PHPicker` directly to a Firebase Storage `putData` call is the simplest implementation and works fine in development on a current-generation device.

**Consequences:**
App crashes during listing creation on any device below iPhone 12. Users lose partially-filled listing forms. TestFlight crash reports dominate early feedback.

**Prevention:**
- Resize and compress all images to a maximum of 1920px on the longest dimension before upload.
- Use JPEG compression at 0.7–0.8 quality — an 8000x6000px photo downsampled to 1920px at 0.75 quality is ~400KB vs. 192MB decoded.
- Perform compression on a background `Task` (Swift Concurrency), not on the main thread, to prevent UI freezing.
- Upload files from disk using `putFile(from: localURL)` rather than `putData(from: Data)` — this reads the file in chunks without loading it all into memory.
- Process images sequentially when multiple are selected, not concurrently, to cap peak memory usage.
- Use `imageByPreparingForDisplay()` (iOS 15+) for display thumbnails — it uses the ImageIO framework to downsample at decode time rather than decode-then-resize.

**Detection:**
Test listing creation on an iPhone XR or SE (2nd gen) simulator with iOS memory pressure simulation. Check for `EXC_RESOURCE_EXCEPTION (RESOURCE_TYPE_MEMORY)` crashes.

---

### Pitfall 10: Firestore Real-Time Listeners Left Attached Everywhere

**Severity:** MEDIUM

**What goes wrong:**
SwiftUI views attach Firestore real-time listeners (`addSnapshotListener`) in `.onAppear` and never detach them in `.onDisappear`. As the user navigates between screens, each navigation stacks another listener. Twenty users browsing a busy listing page can generate hundreds of read operations per minute. Firestore charges per read — a "free tier" app can generate tens of thousands of dollars per month at scale from uncleaned listeners alone.

**Why it happens:**
The `addSnapshotListener` pattern is shown without cleanup in most tutorials. SwiftUI's view lifecycle makes it easy to forget that `.onDisappear` must remove the listener.

**Consequences:**
Unexpected Firebase billing spikes. App performance degrades as redundant listeners all fire on the same writes. At scale: bankruptcy-level Firebase invoices.

**Prevention:**
- Store every `ListenerRegistration` handle and call `.remove()` in a `deinit` or `.onDisappear` block.
- Use a `@StateObject` ViewModel that owns the listener and removes it when the ViewModel is deallocated.
- Audit which views genuinely need real-time data (dashboard, rental request screen) vs. which can use `.getDocuments()` (browse listings, user profile).
- For the browse/search flow, use one-time `.getDocuments()` with pagination — not real-time listeners.
- For Supabase: call `.unsubscribe()` on all Realtime channels when the view disappears. The free tier has strict concurrent subscription limits.

**Detection:**
Use Xcode's Memory Graph Debugger to confirm listeners are not accumulating. Check Firebase console read counts during a 10-minute simulated browse session — if counts grow linearly with navigation, listeners are leaking.

---

### Pitfall 11: Marketplace Cold Start — Building Demand Features Before Supply Exists

**Severity:** MEDIUM

**What goes wrong:**
Beta launches with a polished renter experience (search, filters, map view, request flow) but almost no listings. Renters open the app, find nothing to rent, and never return. The "aha moment" (finding and requesting a real item) never happens. Supply — listed items — is the bottleneck, but the team built for demand.

**Why it happens:**
The renter experience is more feature-rich and satisfying to build. The lister/supply experience feels simpler. Cold start dynamics are underestimated.

**Consequences:**
Zero retention in the first beta cohort. Negative early reviews ("nothing to rent"). The window for organic word-of-mouth from early adopters closes.

**Prevention:**
- Prioritize the lister (supply-side) experience in beta. Make listing an item as fast as possible — under 3 minutes from first open to published listing.
- Personally seed 20–50 listings before opening beta to renters. Founders list their own items. Recruit friends, colleagues, local community groups to list items first.
- Build "one-to-many" supply features before demand features: bulk listing tools, listing templates, duplication of similar items.
- Gate renter access (invite-only or geography-limited) until a minimum listing density is achieved in a target area.
- Do not invest engineering time in advanced search filters, map clustering, or recommendation algorithms until there are enough listings to make them useful.

**Detection:**
Before opening to renters: count listings per geographic area. If fewer than 20 listings exist in the target launch area, demand-side features will fail regardless of quality.

---

## Minor Pitfalls

Mistakes that cause technical debt or wasted time but are recoverable.

---

### Pitfall 12: Building an Admin Dashboard in Beta

**Severity:** LOW

**What goes wrong:**
Teams build a custom web admin dashboard for Rentola during beta — user management, listing moderation, rental oversight, analytics charts. This takes 3–6 weeks of engineering time. It is then rebuilt or discarded entirely when the product pivots based on beta feedback, or when the team discovers that Firebase Console, Supabase Studio, and a simple Retool/Metabase setup do everything they need for 50–500 beta users.

**Prevention:**
Use Firebase Console or Supabase Studio for all admin operations during beta. If a custom tool is genuinely needed, use Retool or Metabase — configure in hours, not weeks. Build a custom admin dashboard only when beta feedback reveals a specific workflow that existing tools cannot support.

---

### Pitfall 13: Building a Full In-App Chat System

**Severity:** LOW

**What goes wrong:**
Teams build real-time chat between renters and lenders for beta. Chat is a product unto itself: delivery receipts, read state, push notifications for messages, image attachments, moderation, retention/deletion policies. It consumes 4–8 weeks of engineering. In beta, most user communication about rentals happens via phone or email anyway, and the rental request/approval flow reduces the need for freeform chat substantially.

**Prevention:**
For beta: surface the lender's contact preference (phone, email) on the rental request screen. Use a simple text field for the renter to include a message with their request — stored as a field on the rental document, not a real-time chat thread. Build real chat only if beta data reveals it as a top user request.

---

### Pitfall 14: Building Complex Search Filters Before Data Exists

**Severity:** LOW

**What goes wrong:**
Teams build multi-faceted search filters (category, price range, distance, availability dates, condition, delivery options) backed by compound Firestore indexes. The indexes are created eagerly, driving up Firestore costs. In beta with <500 listings, users can scroll through all results — filters provide no meaningful UX improvement. Compound Firestore queries also have an important limitation: `array-contains` and range filters on different fields require composite indexes, and `in` queries are limited to 30 values. Building complex filters early means hitting these limits mid-refactor.

**Prevention:**
For beta: offer only category filtering and location-based distance sorting. Defer all other filters until listing volume justifies them (typically 1,000+ listings per category).

---

### Pitfall 15: Storing Full-Resolution Images in Firestore Documents

**Severity:** LOW

**What goes wrong:**
Developers store image data as Base64 strings inside Firestore documents instead of using Firebase Storage or Supabase Storage. A single Firestore document is limited to 1 MiB. A 2MB compressed listing photo immediately hits this limit. Base64 encoding inflates size by ~33%. Every document read costs a Firestore read operation — including the embedded image bytes.

**Prevention:**
Always store images in Firebase Storage or Supabase Storage. Store only the download URL (a plain string) in the Firestore/Postgres document. Never encode binary data into Firestore documents.

---

### Pitfall 16: Privacy Manifest Omissions Causing Submission Rejection

**Severity:** LOW (but time-sensitive)

**What goes wrong:**
Since May 2024, Apple requires a `PrivacyInfo.xcprivacy` file that declares all privacy-sensitive API usage and explains why each is used. Common omissions in marketplace apps: `NSPhotoLibraryUsageDescription` (photo picker), `NSLocationWhenInUseUsageDescription` (map/search), `NSUserTrackingUsageDescription` (if any analytics is added), and any third-party SDK that uses required-reason APIs. Apple rejected 12% of submissions in Q1 2025 for Privacy Manifest violations.

**Prevention:**
- Add `PrivacyInfo.xcprivacy` at project creation, not before submission.
- Every third-party SDK (Firebase, Crashlytics, etc.) must also have its own privacy manifest — verify SDK versions include one.
- Run `xcodebuild -generatePrivacyReport` to audit declared API usage before submission.
- Add `NSPhotoLibraryUsageDescription` for listing photo upload, `NSLocationWhenInUseUsageDescription` for nearby search, `NSCameraUsageDescription` if camera capture is supported.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| App submission (first) | UGC moderation features missing → rejection | Build Report/Block UI before first submission |
| App submission (first) | Privacy manifest gaps → 12% rejection rate | Generate privacy report in Xcode pre-submission |
| Listing creation | Full-res image crashes on older devices | Compress to 1920px max before any upload |
| Push notifications | Premature permission prompt → 60–80% denial | Context-triggered permission request only |
| Push notifications | APNs entitlement missing → ITMS-90078 warning | Enable Push Notifications capability in Xcode |
| Rental approval flow | Double-booking from race conditions | Atomic Firestore transaction for all state changes |
| Rental dates | Timezone ambiguity in cross-region rentals | Always store UTC; display with timezone context |
| Backend (Firebase) | Test-mode security rules in beta | Write production rules before TestFlight |
| Backend (Supabase) | RLS disabled by default → data exposed | Enable RLS on all tables at schema creation |
| Backend (Firestore) | Listener leak → billing spike | Audit all `addSnapshotListener` calls for cleanup |
| Beta launch | No supply → renters find nothing | Seed 20–50 listings before opening to renters |
| Beta scope | Custom admin dashboard wastes weeks | Use Firebase/Supabase Studio until 500+ users |
| Beta scope | In-app chat bloats scope | Use request message field + contact info instead |

---

## Sources

- Apple App Review Guidelines (official, accessed April 2026): https://developer.apple.com/app-store/review/guidelines/
- Apple: Requesting authorization to use location services: https://developer.apple.com/documentation/corelocation/requesting-authorization-to-use-location-services
- Apple: Choosing the Location Services Authorization to Request: https://developer.apple.com/documentation/bundleresources/choosing-the-location-services-authorization-to-request
- Firebase Security Checklist (official): https://firebase.google.com/support/guides/security-checklist
- Firebase: Avoid insecure rules: https://firebase.google.com/docs/rules/insecure-rules
- Firebase: Real-time queries at scale: https://firebase.google.com/docs/firestore/real-time_queries_at_scale
- Firebase: Upload files on Apple platforms: https://firebase.google.com/docs/storage/ios/upload-files
- Supabase Realtime Limits (official): https://supabase.com/docs/guides/realtime/limits
- Supabase Realtime Pricing (official): https://supabase.com/docs/guides/realtime/pricing
- Firebase data exposure research (Cryptika, September 2025): https://www.cryptika.com/numerous-applications-using-googles-firebase-platform-leaking-highly-sensitive-data/
- Top 10 Firebase mistakes (DEV Community, 2025): https://dev.to/mridudixit15/top-10-mistakes-developers-still-make-with-firebase-in-2025-53ah
- iOS App Store Review Guidelines 2026 (CrustLab): https://crustlab.com/blog/ios-app-store-review-guidelines/
- Apple Developer Privacy Compliance 2025: https://clause-guard.com/blog/apple-developer-privacy-compliance-2025-avoid-app-rejection-account-termination
- Silent Push Notifications in iOS (Medium): https://mohsinkhan845.medium.com/silent-push-notifications-in-ios-opportunities-not-guarantees-2f18f645b5d5
- APNs Update 2025 — certificate changes (Medium): https://medium.com/@pulkitvora/apns-update-2025-how-to-prepare-your-app-for-apples-new-push-notification-certificates-16febf8e8dc1
- iOS Memory Management Guide 2025: https://www.alimertgulec.com/en/blog/ios-memory-management-performance-2025
- Optimizing Images (SwiftjectiveC): https://www.swiftjectivec.com/optimizing-images/
- Preventing double bookings (Tokeet, 2025): https://blog.tokeet.com/prevent-double-bookings/
- Booking timezone bug (Bubble Forum): https://forum.bubble.io/t/booking-in-different-timezones/342204
- Solving the marketplace cold start problem (Rangle.io): https://rangle.io/blog/bootstrapping-an-online-marketplace
- Andrew Chen — Cold Start Problem: https://andrewchen.com/how-to-solve-the-cold-start-problem-for-social-products/
- Firestore query and record limitations (Estuary): https://estuary.dev/blog/firestore-limitations/
- Missing Push Notification Entitlement fix (Mobot): https://www.mobot.io/blog/how-to-fix-missing-push-notification-entitlement
- iOS Push Notifications complete setup guide (Bugfender): https://bugfender.com/blog/ios-push-notifications/
