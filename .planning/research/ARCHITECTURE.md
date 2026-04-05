# Architecture Patterns

**Domain:** Peer-to-peer rental marketplace iOS app
**Project:** Rentola
**Researched:** 2026-04-06
**Overall confidence:** HIGH (primary claims verified against official docs and multiple current sources)

---

## Recommended Architecture

### Overview

Rentola should use **MVVM with the Coordinator pattern** layered on top of SwiftUI's native primitives (`NavigationStack`, `NavigationPath`, `@Observable`). This is the dominant pattern in production SwiftUI marketplace apps as of 2025 and represents a pragmatic balance between simplicity for a small beta team and the ability to scale.

TCA (The Composable Architecture) is powerful but carries a steep functional programming learning curve and significant boilerplate overhead. It is not recommended for a greenfield beta where velocity matters. The escape hatch to TCA remains open later if state complexity warrants it.

```
App
├── AppCoordinator          ← switches onboarding ↔ main app
│   └── MainTabCoordinator  ← owns tab selection + per-tab coordinators
│       ├── BrowseCoordinator   (Browse tab)
│       ├── MyRentalsCoordinator (My Rentals tab)
│       ├── InboxCoordinator    (Inbox/Requests tab)
│       └── ProfileCoordinator  (Profile tab)
│
├── Feature Modules (per tab / feature)
│   ├── View               ← SwiftUI view, reads from ViewModel
│   ├── ViewModel          ← @Observable class, holds state, calls services
│   └── Model              ← plain Swift value types (structs/enums)
│
└── Services Layer
    ├── FirestoreService   ← document reads/writes, snapshot listeners
    ├── AuthService        ← sign-in, session
    ├── StorageService     ← image upload/download
    └── NotificationService ← FCM token registration, deep link routing
```

---

## 1. iOS App Architecture

### Recommendation: MVVM + Coordinator (with @Observable)

**Pattern:** Model-View-ViewModel with a Coordinator layer for navigation.

**Rationale:**
- MVVM is the established standard for SwiftUI — every major Apple SwiftUI sample and most production apps use it.
- iOS 17's `@Observable` macro eliminates the boilerplate of `ObservableObject` + `@Published`, making MVVM leaner than it was in 2022.
- The Coordinator pattern solves the one real MVVM pain point: navigation logic leaking into views. It also makes push-notification-driven deep linking tractable (see section 7).
- MVVM is familiar to any iOS hire. TCA's functional paradigm requires retraining.

**When MVVM starts to show cracks:** ViewModels for listings + rental state + inbox will each accumulate significant logic. Mitigate with one ViewModel per screen (not per feature), thin service objects for persistence, and a clear rule that ViewModels never talk to each other directly.

### iOS-Specific Implementation Notes

Use `@Observable` (iOS 17+) for ViewModels — it requires only the macro, no `@Published` annotations:

```swift
@Observable
final class ListingDetailViewModel {
    var listing: Listing?
    var rentalRequest: RentalRequest?
    var isLoading = false
    var error: AppError?

    private let firestoreService: FirestoreServiceProtocol

    init(listingId: String, firestoreService: FirestoreServiceProtocol = FirestoreService.shared) {
        self.firestoreService = firestoreService
    }
}
```

In views, pass the ViewModel via `@State` (not `@StateObject` — that is the old ObservableObject pattern):

```swift
struct ListingDetailView: View {
    @State private var viewModel: ListingDetailViewModel

    init(listingId: String) {
        _viewModel = State(initialValue: ListingDetailViewModel(listingId: listingId))
    }
}
```

**Minimum iOS target:** Set to iOS 17 to use `@Observable`. If iOS 16 support is required, fall back to `ObservableObject` + `@Published`.

---

## 2. Rental State Machine

### Recommendation: Swift enum with actor-isolated transition logic

**Pattern:** A `RentalStatus` enum encoding every valid lifecycle state, with a dedicated actor or service method that validates and performs transitions. The enum lives in the data model; transition logic lives in a `RentalService`.

**Rental lifecycle:**

```
pending → approved → active → expiring → returned
    ↓         ↓         ↓
 declined  cancelled  cancelled
```

`expiring` is a derived state (computed from `endDate` proximity) rather than a stored state — avoids race conditions from concurrent writes.

### Swift Implementation

```swift
enum RentalStatus: String, Codable, Sendable {
    case pending      // renter has requested, owner has not yet responded
    case approved     // owner approved, rental not yet started
    case active       // rental window has begun
    case returned     // item confirmed returned, lifecycle complete
    case declined     // owner declined the request
    case cancelled    // cancelled by either party before active
}

extension RentalStatus {
    /// Valid transitions from this state.
    var allowedTransitions: Set<RentalStatus> {
        switch self {
        case .pending:   return [.approved, .declined, .cancelled]
        case .approved:  return [.active, .cancelled]
        case .active:    return [.returned, .cancelled]
        case .returned, .declined, .cancelled:
            return []  // terminal states
        }
    }

    func canTransition(to next: RentalStatus) -> Bool {
        allowedTransitions.contains(next)
    }
}
```

Actor-isolated service for thread-safe transitions:

```swift
actor RentalService {
    func transition(rental: Rental, to newStatus: RentalStatus) async throws -> Rental {
        guard rental.status.canTransition(to: newStatus) else {
            throw RentalError.invalidTransition(from: rental.status, to: newStatus)
        }
        // write to Firestore, return updated rental
    }
}
```

**Why not a third-party state machine library:** The rental domain has six states and a small, well-understood transition graph. A handwritten enum is readable, testable, and has zero dependencies. Libraries like Tinder/StateMachine or SwiftState add value for state machines with dozens of states and complex side-effect graphs.

**`expiring` state:** Surface this in the UI by computing `isExpiringSoon` on the `Rental` model (`endDate` within 24 hours) rather than writing a separate Firestore status. This avoids a server-side cron dependency in the beta.

---

## 3. Data Model

### Recommendation: Value-type models with Firestore Codable mapping

**Core entities:**

```swift
// A listed item available for rent
struct Listing: Identifiable, Codable {
    @DocumentID var id: String?
    let ownerId: String          // references User.id
    var title: String
    var description: String
    var categoryId: String
    var pricePerDay: Double
    var currency: String          // ISO 4217, e.g. "SEK"
    var imageUrls: [String]       // Firebase Storage download URLs
    var isAvailable: Bool
    @ServerTimestamp var createdAt: Date?
    @ServerTimestamp var updatedAt: Date?
}

// A renter's request to rent a listing
struct RentalRequest: Identifiable, Codable {
    @DocumentID var id: String?
    let listingId: String
    let listingTitle: String      // denormalized — avoids join on display
    let renterId: String
    let ownerId: String
    var status: RentalStatus
    var startDate: Date
    var endDate: Date
    var totalPrice: Double
    var message: String?          // optional renter note
    @ServerTimestamp var createdAt: Date?
    @ServerTimestamp var updatedAt: Date?
}

// A confirmed rental — promoted from RentalRequest on approval
struct Rental: Identifiable, Codable {
    @DocumentID var id: String?
    let requestId: String
    let listingId: String
    let listingTitle: String
    let renterId: String
    let ownerId: String
    var status: RentalStatus
    var startDate: Date
    var endDate: Date
    var totalPrice: Double
    @ServerTimestamp var createdAt: Date?
    @ServerTimestamp var updatedAt: Date?

    var isExpiringSoon: Bool {
        guard let end = Calendar.current.date(byAdding: .hour, value: -24, to: endDate) else { return false }
        return Date() >= end && status == .active
    }
}

struct UserProfile: Identifiable, Codable {
    @DocumentID var id: String?
    var displayName: String
    var avatarUrl: String?
    var bio: String?
    var averageRating: Double     // denormalized aggregate
    var reviewCount: Int
    var fcmToken: String?         // updated on login for push notifications
    @ServerTimestamp var createdAt: Date?
}

struct Review: Identifiable, Codable {
    @DocumentID var id: String?
    let rentalId: String
    let reviewerId: String
    let revieweeId: String
    var rating: Int               // 1–5
    var comment: String?
    var role: ReviewRole          // .asRenter or .asOwner
    @ServerTimestamp var createdAt: Date?
}

enum ReviewRole: String, Codable {
    case asRenter
    case asOwner
}
```

### Firestore Collection Structure

```
/users/{userId}
/listings/{listingId}
/rentalRequests/{requestId}
/rentals/{rentalId}
/reviews/{reviewId}
/users/{userId}/fcmTokens/{tokenId}    ← subcollection for multi-device
```

### Key Design Decisions

- **Denormalize `listingTitle`, `ownerId`, `renterId` onto `RentalRequest` and `Rental`**: Firestore has no joins. Queries for "my rentals" need these fields to render list rows without a second read per document.
- **Separate `RentalRequest` from `Rental`**: Requests are disposable (declined/cancelled) and frequently queried by owners. Rentals are the confirmed record. Mixing them in one collection makes state queries noisy.
- **`@DocumentID` and `@ServerTimestamp`**: Use FirebaseFirestoreSwift wrappers for clean Codable mapping. `@ServerTimestamp` ensures consistent timestamps across clients with drifting clocks.
- **Average rating on `UserProfile`**: Denormalized and updated via a Cloud Function on review write. Avoids expensive aggregation queries in the client.

---

## 4. Real-Time Updates

### Recommendation: Firestore snapshot listeners scoped to the current user

**Pattern:** Each ViewModel that displays live data (my rentals list, inbox, rental detail) attaches a Firestore `addSnapshotListener` on `onAppear` and removes it on `onDisappear` (or on deinit). Listeners are scoped to the authenticated user to minimize reads and cost.

```swift
@Observable
final class MyRentalsViewModel {
    var rentals: [Rental] = []
    private var listener: ListenerRegistration?

    func startListening(userId: String) {
        listener = Firestore.firestore()
            .collection("rentals")
            .whereField("renterId", isEqualTo: userId)
            .order(by: "createdAt", descending: true)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self, let docs = snapshot?.documents else { return }
                self.rentals = docs.compactMap { try? $0.data(as: Rental.self) }
            }
    }

    func stopListening() {
        listener?.remove()
        listener = nil
    }
}
```

**Owner inbox (incoming requests):** Mirror the same pattern on `rentalRequests` filtered by `ownerId` and `status == pending`.

**Dual-party propagation:** Because both `Rental` and `RentalRequest` documents carry `renterId` and `ownerId`, a single document write (status change) propagates to listeners on both sides simultaneously — no fan-out write needed. The renter's "My Rentals" listener and the owner's "Inbox" listener both read from their respective queries on the same document.

**Push notifications complement listeners:** Listeners handle foreground state. Push notifications (via FCM) wake the app and navigate to the relevant screen when the app is backgrounded or killed. The two mechanisms together give full coverage without polling.

**Supabase note:** If the backend decision shifts to Supabase, the pattern is identical in principle (use Supabase Realtime channels scoped to row-level filters). However, Firebase has a mature Swift SDK with `@DocumentID` / `@ServerTimestamp` Codable support out of the box. Supabase requires external push notification infrastructure (e.g. APNs via Edge Functions). Firebase is the lower-friction choice for this beta.

---

## 5. Offline Handling

### Recommendation: Firestore's built-in offline persistence, no additional caching layer for beta

**Pattern:** Enable Firestore's built-in offline persistence (it is on by default for iOS). Add a lightweight `NetworkMonitor` to surface a "you're offline" banner in the UI rather than silently failing.

**What Firestore offline gives you for free:**
- Cached copies of all documents the app has fetched in the current session.
- Queued local writes (create/update) that flush when connectivity returns.
- Listeners continue to emit from the local cache; the UI stays populated.
- Default cache size: 40 MB on disk. Configurable up to unlimited.

**What it does not give you:**
- Pre-fetching listings the user has never seen (cold browse while offline).
- Guaranteed delivery of write operations if the app is killed before reconnecting.

**Recommended implementation for beta:**

```swift
// AppDelegate or App init
let settings = FirestoreSettings()
settings.cacheSettings = PersistentCacheSettings(sizeBytes: Int64(100 * 1024 * 1024)) // 100 MB
Firestore.firestore().settings = settings
```

```swift
// NetworkMonitor — show banner, disable submit buttons when offline
import Network

@Observable
final class NetworkMonitor {
    var isConnected = true
    private let monitor = NWPathMonitor()

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
            }
        }
        monitor.start(queue: DispatchQueue(label: "NetworkMonitor"))
    }
}
```

**What to communicate to users when offline:** Show a non-blocking banner ("No internet — showing cached content"). Disable the "Send Request" button with a tooltip. Do not attempt to queue rental requests for later — partial network state during a two-party transaction is dangerous. Let the user retry when connected.

**Post-beta:** If offline-first browse becomes a requirement (e.g. users pre-load listings before going somewhere with poor connectivity), revisit with a SwiftData layer as a structured local cache alongside Firestore. Not needed for beta.

---

## 6. Image Handling

### Recommendation: Nuke for listing images; native AsyncImage acceptable for avatars

**Pattern:** Use [Nuke](https://github.com/kean/Nuke) (via its SwiftUI wrapper `LazyImage`) for all listing gallery images, which are the most performance-sensitive. Native `AsyncImage` is acceptable for small, infrequently-shown profile avatars.

**Why Nuke over AsyncImage:**
- `AsyncImage` does not reliably cache decoded images across view lifecycles. Scrolling a listing grid causes repeated network fetches.
- Nuke provides LRU memory cache + disk cache with configurable limits.
- Nuke's `LazyImage` is SwiftUI-native, supports placeholders, failure states, and image processors (resize before caching).
- Memory efficiency: Nuke uses ~40 MB less memory than Kingfisher in benchmarks for image-heavy feeds.

**Why Nuke over Kingfisher:** Both are actively maintained. Nuke is leaner (under 900 LOC core), has better async/await integration, and is purpose-built for performance. Either works — choose Nuke as the default.

**Basic integration:**

```swift
import NukeUI

struct ListingImageView: View {
    let url: URL

    var body: some View {
        LazyImage(url: url) { state in
            if let image = state.image {
                image.resizable().aspectRatio(contentMode: .fill)
            } else if state.error != nil {
                Image(systemName: "photo")
                    .foregroundStyle(.secondary)
            } else {
                Rectangle().foregroundStyle(.quaternary) // placeholder shimmer
            }
        }
        .processors([ImageProcessors.Resize(width: 600)]) // resize before caching
    }
}
```

**Firebase Storage integration:** Store image download URLs on the `Listing` document (not paths). Download URLs are long-lived public HTTPS URLs that Nuke can load directly, with no Firebase SDK call on the read path.

**Upload pattern (listing creation):** Upload to Firebase Storage first, get the download URL, then write the `Listing` document with the URL included. Never write the `Listing` before the upload completes — a listing with a broken image URL is worse than a delayed listing.

---

## 7. Navigation

### Recommendation: Coordinator pattern over NavigationStack + NavigationPath with a 4-tab root structure

**Pattern:** `AppCoordinator` → `MainTabCoordinator` → per-feature `Coordinator` classes, each owning a `NavigationPath`. Deep links from push notifications are parsed at the `AppCoordinator` level and dispatched to the appropriate tab coordinator.

**Tab structure for Rentola:**

```
Tab 1: Browse      — listing search/grid, listing detail
Tab 2: My Rentals  — renter's active/past rentals
Tab 3: Inbox       — owner's incoming requests, ongoing rentals as owner
Tab 4: Profile     — user profile, reviews, settings
```

**Coordinator skeleton:**

```swift
@Observable
final class BrowseCoordinator {
    var path = NavigationPath()

    enum Destination: Hashable {
        case listingDetail(listingId: String)
        case userProfile(userId: String)
        case createRentalRequest(listing: Listing)
    }

    func push(_ destination: Destination) {
        path.append(destination)
    }

    func pop() {
        path.removeLast()
    }

    func popToRoot() {
        path.removeLast(path.count)
    }
}

struct BrowseTab: View {
    @State private var coordinator = BrowseCoordinator()

    var body: some View {
        NavigationStack(path: $coordinator.path) {
            BrowseRootView(coordinator: coordinator)
                .navigationDestination(for: BrowseCoordinator.Destination.self) { destination in
                    switch destination {
                    case .listingDetail(let id):
                        ListingDetailView(listingId: id, coordinator: coordinator)
                    case .userProfile(let id):
                        UserProfileView(userId: id)
                    case .createRentalRequest(let listing):
                        RentalRequestView(listing: listing, coordinator: coordinator)
                    }
                }
        }
    }
}
```

**Deep linking from push notifications:**

```swift
// In App struct
@main
struct RentolaApp: App {
    @State private var appCoordinator = AppCoordinator()

    var body: some Scene {
        WindowGroup {
            RootView(coordinator: appCoordinator)
                .onOpenURL { url in
                    appCoordinator.handle(url: url)
                }
        }
    }
}

// In AppCoordinator
func handle(url: URL) {
    // e.g. rentola://rental/abc123
    guard url.scheme == "rentola" else { return }
    switch url.host {
    case "rental":
        let rentalId = url.lastPathComponent
        switchToTab(.myRentals)
        myRentalsCoordinator.push(.rentalDetail(rentalId: rentalId))
    case "request":
        let requestId = url.lastPathComponent
        switchToTab(.inbox)
        inboxCoordinator.push(.requestDetail(requestId: requestId))
    default:
        break
    }
}
```

**FCM notification → deep link pipeline:**
1. Notification payload includes `"deepLink": "rentola://rental/abc123"` in `userInfo`.
2. `AppDelegate.userNotificationCenter(_:didReceive:)` extracts the URL and calls `UIApplication.shared.open(url)`.
3. `onOpenURL` fires in the SwiftUI app, dispatches to `AppCoordinator.handle(url:)`.
4. Coordinator switches tab and pushes the correct destination.

**Why not NavigationLink scattered in views:** Deeply linked navigation (from notifications, universal links) requires imperative control over the navigation stack. Declarative `NavigationLink` inside views cannot be driven from outside the view — the coordinator pattern solves this cleanly.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `AppCoordinator` | Auth state routing, deep link dispatch | `MainTabCoordinator` |
| `MainTabCoordinator` | Tab selection, per-tab coordinator lifecycle | Per-feature coordinators |
| `BrowseCoordinator` | Browse-tab navigation stack | `BrowseRootViewModel`, `ListingDetailViewModel` |
| `InboxCoordinator` | Owner inbox navigation | `InboxViewModel`, `RequestDetailViewModel` |
| `MyRentalsCoordinator` | Renter rentals navigation | `MyRentalsViewModel`, `RentalDetailViewModel` |
| `ProfileCoordinator` | Profile, reviews, settings | `ProfileViewModel` |
| `FirestoreService` | All Firestore reads/writes, snapshot listeners | ViewModels |
| `AuthService` | Firebase Auth, session state | `AppCoordinator`, ViewModels |
| `StorageService` | Firebase Storage upload/download URLs | `ListingCreationViewModel` |
| `NotificationService` | FCM token registration, notification permissions | `AppCoordinator` |
| `NetworkMonitor` | Connectivity state | Any ViewModel that submits writes |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Navigation logic inside Views
**What:** Using `NavigationLink(destination:)` with inline view construction, or calling `dismiss()` to pop back from a detail view.
**Why bad:** Cannot be driven programmatically from a notification tap. Makes deep linking brittle.
**Instead:** All navigation goes through the coordinator's `push()` / `pop()` methods.

### Anti-Pattern 2: Fat ViewModels for multiple screens
**What:** One `RentalViewModel` that handles the request list, individual request detail, status transitions, and the owner response flow.
**Why bad:** Untestable, hard to isolate state for a single screen.
**Instead:** One ViewModel per screen. Shared data flows through services, not between ViewModels.

### Anti-Pattern 3: Storing `RentalStatus` transitions client-side only
**What:** Updating status locally and syncing to Firestore eventually.
**Why bad:** Two users (renter and owner) can act simultaneously. Optimistic local state causes conflicts.
**Instead:** Write the new status to Firestore first; update local state only on the confirmed snapshot callback. For beta, pessimistic updates are safer than optimistic ones.

### Anti-Pattern 4: Embedding Firestore calls directly in Views
**What:** Calling `Firestore.firestore().collection(...).addSnapshotListener` inside a `View.onAppear`.
**Why bad:** Untestable, listener lifecycle tied to view lifecycle rather than ViewModel lifecycle, violates separation of concerns.
**Instead:** All Firestore interaction lives in service objects, called from ViewModels.

### Anti-Pattern 5: Writing image paths instead of download URLs to Firestore
**What:** Storing `"images/userId/listingId/photo1.jpg"` on the Listing document and resolving to a download URL on each read.
**Why bad:** Each image display triggers a Firebase Storage SDK call (an extra async round-trip) and burns download URL quota.
**Instead:** Resolve the download URL once at upload time and store the full HTTPS URL on the document.

---

## Scalability Considerations

| Concern | Beta (< 1K users) | Post-beta (> 10K users) |
|---------|-------------------|------------------------|
| Firestore reads | Per-user snapshot listeners are fine | Add server-side caching (Redis) if read costs spike; paginate listing queries |
| Image storage | Firebase Storage on default plan | Move to CDN-backed storage (Cloudflare R2, Imgix) for resizing at edge |
| Push notifications | FCM direct from client via Cloud Functions trigger | Same — FCM scales to billions of devices |
| State transitions | Client-written Firestore fields | Move to Cloud Functions for authoritative server-side transitions with validation |
| Reviews/ratings | Client-written with no aggregation | Cloud Function on review write to update `UserProfile.averageRating` atomically |
| Navigation | Single coordinator per tab | No change needed; coordinator pattern already modular |

---

## Sources

- [The Ultimate Guide to Modern iOS Architecture in 2025](https://medium.com/@csmax/the-ultimate-guide-to-modern-ios-architecture-in-2025-9f0d5fdc892f) — MEDIUM confidence (Medium article, consistent with other sources)
- [Modern iOS App Architecture in 2026: MVVM vs Clean Architecture vs TCA](https://7span.com/blog/mvvm-vs-clean-architecture-vs-tca) — MEDIUM confidence
- [Mastering SwiftUI Navigation in 2025: Coordinators, MVVM & Tab Bars](https://medium.com/@sunnygulatiios/mastering-swiftui-navigation-in-2025-coordinators-mvvm-tab-bars-6eb34d440940) — MEDIUM confidence
- [Bringing robust navigation structure to your SwiftUI app](https://developer.apple.com/documentation/swiftui/bringing_robust_navigation_structure_to_your_swiftui_app) — HIGH confidence (Apple official docs)
- [Migrating from ObservableObject to the Observable macro](https://developer.apple.com/documentation/SwiftUI/Migrating-from-the-observable-object-protocol-to-the-observable-macro) — HIGH confidence (Apple official docs)
- [SwiftUI's Observable macro is not a drop-in replacement for ObservableObject](https://www.jessesquires.com/blog/2024/09/09/swift-observable-macro/) — HIGH confidence (well-known Swift community author)
- [Get realtime updates with Cloud Firestore](https://firebase.google.com/docs/firestore/query-data/listen) — HIGH confidence (Firebase official docs)
- [Access data offline — Firestore](https://firebase.google.com/docs/firestore/manage-data/enable-offline) — HIGH confidence (Firebase official docs)
- [SwiftUI & Firestore: Sync Data in Realtime](https://medium.com/firebase-developers/swiftui-fetching-data-from-firestore-in-real-time-d95a020e78f) — MEDIUM confidence (Firebase Developers Medium publication)
- [Downloading and Caching images in SwiftUI — SwiftLee](https://www.avanderlee.com/swiftui/downloading-caching-images/) — HIGH confidence (Antoine van der Lee, established Swift author)
- [Nuke image loading system](https://github.com/kean/Nuke) — HIGH confidence (official GitHub repo)
- [Safe State Machines in Swift](https://betterprogramming.pub/safe-state-machines-in-swift-a6e9119ef97c) — MEDIUM confidence
- [Firebase vs Supabase Realtime comparison](https://ably.com/compare/firebase-vs-supabase) — MEDIUM confidence (Ably, third-party comparison)
- [Deep linking for local notifications in SwiftUI — Swift with Majid](https://swiftwithmajid.com/2024/04/09/deep-linking-for-local-notifications-in-swiftui/) — HIGH confidence (Majid Jabrayilov, well-known SwiftUI author)
- [Navigation and Deep-Links in SwiftUI — QuickBird Studios](https://quickbirdstudios.com/blog/swiftui-navigation-deep-links/) — MEDIUM confidence
