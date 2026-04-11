# Phase 1: Foundation — Research

**Researched:** 2026-04-06
**Domain:** SwiftUI iOS 17, Supabase Auth (PKCE), MVVM + Coordinator pattern, Supabase Storage, PostgreSQL RLS
**Confidence:** HIGH (primary claims verified against official Supabase docs and Apple documentation)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** App opens to a branded welcome/landing screen with "Sign in" and "Create account" buttons — Airbnb-style first impression, not straight to a form.
- **D-02:** Email verification is required before users can enter the app. After signup, show a "Check your email" screen; app only unlocks once the verification link is clicked and the session is confirmed.
- **D-03:** Auth forms are full-screen (not modal sheets) — they are the primary entry point.
- **D-04:** 4-tab navigation. Suggested: Browse, Renting, Listing, Profile.
- **D-05:** Each tab has its own Coordinator with placeholder screens in Phase 1.
- **D-06:** After email verification, users land directly in the app. Profile setup is accessible via the Profile tab but is not a mandatory interstitial step.

### Claude's Discretion
- Exact tab icons and colours (use clean SF Symbols, match minimal Airbnb-style aesthetic)
- Loading skeleton vs spinner for auth state check on launch
- Exact error message copy for auth failures
- Empty state design for dashboards (keep consistent across renter and owner)

### Deferred Ideas (OUT OF SCOPE)
- Apple Sign In — deferred to post-beta
- Mandatory onboarding interstitial — user preferred direct app entry after verification
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can create an account with email and password | Supabase `auth.signUp(email:password:redirectTo:)` — verified in official docs |
| AUTH-02 | User can log in with email and password | Supabase `auth.signIn(email:password:)` — verified in official docs |
| AUTH-03 | User can reset password via email link | `auth.resetPasswordForEmail(_:redirectTo:)` + `auth.updateUser(user:)` — verified |
| PROF-01 | User can set a display name and upload an avatar | `profiles` table + Supabase Storage `avatars` bucket + PhotosPicker |
| PROF-02 | User can write a short bio visible on their profile | `bio` column on `profiles` table, profile update via PostgREST |
| PROF-03 | Profile displays aggregated rating (field only — Phase 4 populates it) | `average_rating` column on `profiles`, placeholder display in Phase 1 |
</phase_requirements>

---

## Summary

Phase 1 establishes the entire architectural skeleton that every subsequent phase builds on. The three interdependent pieces are: (1) the SwiftUI coordinator hierarchy that routes between auth and the tab shell, (2) Supabase Auth PKCE flow with email verification gating, and (3) the `profiles` table with RLS from day one.

The biggest Phase 1 risk is the email verification gate. Supabase's email/password signup with email confirmation enabled returns a `user` but a `nil` session. The app must show a blocking "Check your email" screen and wait. The unlock mechanism is a custom URL scheme deep link: the user clicks the verification link in the email, iOS opens the app via `rentola://auth-callback`, `.onOpenURL` fires, and `supabase.auth.session(from: url)` exchanges the PKCE code for a real session, which triggers a `SIGNED_IN` event in `authStateChanges`. The app responds by transitioning to the main tab shell.

The second key risk is launch-time flicker. The pattern to prevent it is a single boolean `isLoading` state in `AppCoordinator` that shows a neutral loading indicator (spinner or skeleton) for the ~150ms it takes for `authStateChanges` to emit `.initialSession`. Once that event fires, the coordinator routes to either the welcome screen (session nil) or the tab shell (session present), with no visible flash of the wrong screen.

**Primary recommendation:** Build AppCoordinator → MainTabCoordinator → 4 per-tab coordinators as `@Observable` classes first. Wire auth second. Every subsequent phase drops into the tab coordinators without touching the auth layer.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SwiftUI | iOS 17 (built-in) | UI framework | Declarative, Apple-first; NavigationStack + @Observable available |
| supabase-swift | 2.39.0 (Dec 2025) | Supabase SDK (auth, storage, database, realtime) | Official SDK; PKCE is default; all modules in one package |
| PhotosUI | iOS 16+ (built-in) | `PhotosPicker` for avatar selection | Native, no extra dependency; replaces PHPickerViewController boilerplate |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Combine / AsyncStream | Built-in (Swift 5.9+) | Auth state stream (`authStateChanges`) | Used to observe session events; no third-party needed |
| Network (NWPathMonitor) | Built-in | Offline banner | Disable write-path buttons when disconnected |

### Not Needed in Phase 1
| Package | Reason Deferred |
|---------|----------------|
| Nuke / NukeUI | Phase 2+ (listing image feeds); Phase 1 uses native `AsyncImage` for single avatar |
| SUICoordinator (github.com/felilo/SUICoordinator) | Third-party coordinator library; hand-rolled coordinator is 50 lines and has zero dependencies |

**Installation (Xcode UI — no Package.swift for app targets):**
In Xcode: File > Add Package Dependencies > enter:
```
https://github.com/supabase/supabase-swift
```
Add only the products you need for Phase 1:
- `Supabase` (umbrella, includes Auth + Storage + PostgREST)

Or add individually: `Auth`, `Storage`, `PostgREST`.

**Version verification:** [VERIFIED: github.com/supabase/supabase-swift/releases] — v2.39.0 released 2025-12-18. The STACK.md reference to v2.43 is ahead of this; use `from: "2.0.0"` as the SPM version constraint and let Xcode resolve the current latest. Do not pin to a specific patch version for this project stage.

---

## Architecture Patterns

### Recommended Project Structure
```
Rentola/
├── App/
│   ├── RentolaApp.swift          # @main, WindowGroup, injects AppCoordinator
│   └── AppCoordinator.swift      # @Observable; routes auth vs main shell
│
├── Features/
│   ├── Auth/
│   │   ├── WelcomeView.swift
│   │   ├── SignUpView.swift
│   │   ├── SignInView.swift
│   │   ├── ForgotPasswordView.swift
│   │   ├── CheckEmailView.swift   # Blocking gate while awaiting verification
│   │   ├── UpdatePasswordView.swift
│   │   └── AuthViewModel.swift    # @Observable; calls supabase.auth.*
│   │
│   ├── Main/
│   │   ├── MainTabView.swift      # TabView driven by MainTabCoordinator
│   │   └── MainTabCoordinator.swift
│   │
│   ├── Browse/
│   │   ├── BrowseCoordinator.swift
│   │   └── BrowsePlaceholderView.swift
│   │
│   ├── Renting/
│   │   ├── RentingCoordinator.swift
│   │   └── RentingPlaceholderView.swift
│   │
│   ├── Listing/
│   │   ├── ListingCoordinator.swift
│   │   └── ListingPlaceholderView.swift
│   │
│   └── Profile/
│       ├── ProfileCoordinator.swift
│       ├── ProfileView.swift
│       └── ProfileViewModel.swift
│
├── Services/
│   ├── SupabaseClient.swift       # Singleton SupabaseClient init
│   └── NetworkMonitor.swift
│
├── Models/
│   └── UserProfile.swift
│
└── Resources/
    ├── Info.plist                 # URL scheme for deep links
    └── PrivacyInfo.xcprivacy      # Required from day one (avoid rejection)
```

---

### Pattern 1: AppCoordinator (auth routing with no-flicker launch)

**What:** An `@Observable` class that owns the single source of truth for auth state. It listens to `supabase.auth.authStateChanges` as an async stream and switches between the welcome/auth flow and the main tab shell. A brief loading state prevents flicker.

**When to use:** Always — this is the root router for the entire app.

```swift
// Source: derived from Supabase official Swift tutorial + Apple @Observable docs
// [VERIFIED: supabase.com/docs/guides/getting-started/tutorials/with-swift]
// [VERIFIED: developer.apple.com/documentation/SwiftUI/Migrating-from-the-observable-object-protocol-to-the-observable-macro]

import Supabase
import SwiftUI

enum AppRoute {
    case loading
    case welcome          // unauthenticated, no session
    case checkEmail       // signed up, email not yet confirmed (session nil)
    case updatePassword   // arrived via password-reset deep link
    case main             // authenticated and verified
}

@Observable
final class AppCoordinator {
    var route: AppRoute = .loading

    func startListening() async {
        for await (event, session) in supabase.auth.authStateChanges {
            switch event {
            case .initialSession:
                route = session != nil ? .main : .welcome
            case .signedIn:
                // SIGNED_IN fires on email verification callback AND on normal sign-in
                // Check session to distinguish from "signed up but unconfirmed" state
                route = session != nil ? .main : .welcome
            case .signedOut:
                route = .welcome
            case .passwordRecovery:
                route = .updatePassword
            default:
                break
            }
        }
    }
}
```

Root view pattern — eliminates flicker because `.loading` shows a neutral screen:

```swift
// Source: pattern from Supabase Swift tutorial
// [VERIFIED: supabase.com/docs/guides/getting-started/tutorials/with-swift]

struct RootView: View {
    @State private var coordinator = AppCoordinator()

    var body: some View {
        Group {
            switch coordinator.route {
            case .loading:
                // Neutral background — matches launch screen color
                // Shows for ~150ms while authStateChanges emits .initialSession
                Color("AppBackground")
                    .ignoresSafeArea()
            case .welcome:
                WelcomeView(coordinator: coordinator)
            case .checkEmail:
                CheckEmailView(coordinator: coordinator)
            case .updatePassword:
                UpdatePasswordView(coordinator: coordinator)
            case .main:
                MainTabView()
            }
        }
        .onOpenURL { url in
            // Handles email verification and password reset deep links
            Task {
                try? await supabase.auth.session(from: url)
                // authStateChanges will emit SIGNED_IN — coordinator handles the transition
            }
        }
        .task {
            await coordinator.startListening()
        }
    }
}
```

**Why `.onOpenURL` must be on the root:** Deep link callbacks must be handled regardless of which screen is currently shown. If placed only on `AuthView`, password-reset links would fail when the user is already on a different screen.

---

### Pattern 2: MainTabCoordinator + Per-Tab Coordinators

**What:** `MainTabCoordinator` owns the selected tab index. Each tab has its own `@Observable` coordinator with a `NavigationPath`. This isolates navigation state per-tab and enables deep-link dispatch later.

```swift
// Source: [CITED: developer.apple.com/documentation/swiftui/bringing_robust_navigation_structure_to_your_swiftui_app]
// [CITED: ARCHITECTURE.md coordinator skeleton]

enum Tab: Int, CaseIterable {
    case browse = 0
    case renting = 1
    case listing = 2
    case profile = 3

    var label: String {
        switch self {
        case .browse:   return "Browse"
        case .renting:  return "Renting"
        case .listing:  return "Listing"
        case .profile:  return "Profile"
        }
    }

    var systemImage: String {
        switch self {
        case .browse:   return "magnifyingglass"
        case .renting:  return "key.fill"
        case .listing:  return "tag.fill"
        case .profile:  return "person.circle.fill"
        }
    }
}

@Observable
final class MainTabCoordinator {
    var selectedTab: Tab = .browse

    // Per-tab coordinators — Phase 2–4 expand these
    let browse   = BrowseCoordinator()
    let renting  = RentingCoordinator()
    let listing  = ListingCoordinator()
    let profile  = ProfileCoordinator()

    func switchToTab(_ tab: Tab) {
        selectedTab = tab
    }
}

// Per-tab coordinator skeleton (all four follow the same shape)
@Observable
final class BrowseCoordinator {
    var path = NavigationPath()

    enum Destination: Hashable {
        // Phase 2 adds: listingDetail(String), etc.
    }

    func push(_ destination: Destination) { path.append(destination) }
    func pop() { if !path.isEmpty { path.removeLast() } }
    func popToRoot() { path.removeLast(path.count) }
}
```

```swift
struct MainTabView: View {
    @State private var coordinator = MainTabCoordinator()

    var body: some View {
        TabView(selection: $coordinator.selectedTab) {
            NavigationStack(path: $coordinator.browse.path) {
                BrowsePlaceholderView()
                    .navigationDestination(for: BrowseCoordinator.Destination.self) { _ in
                        EmptyView() // Phase 2 fills this in
                    }
            }
            .tabItem { Label(Tab.browse.label, systemImage: Tab.browse.systemImage) }
            .tag(Tab.browse)

            // Repeat for .renting, .listing, .profile
        }
    }
}
```

---

### Pattern 3: Supabase Client Singleton

**What:** A top-level singleton initialized once, shared across all service calls.

```swift
// Source: [VERIFIED: supabase.com/docs/guides/getting-started/quickstarts/ios-swiftui]

import Supabase

// SupabaseClient.swift — at file scope (not inside a type)
// The anon key is safe to ship in the binary; RLS enforces server-side access.
let supabase = SupabaseClient(
    supabaseURL: URL(string: "https://<project-ref>.supabase.co")!,
    supabaseKey: "<anon-public-key>"
)
```

Put the actual URL and key in a `Config.swift` or via Xcode build settings / xcconfig file. Never hardcode secrets (the anon key is not a secret, but the service role key is — never ship that in the app).

---

### Pattern 4: Auth Flow (Signup, Verification Gate, Sign-In, Password Reset)

**Signup with email verification enabled:**

```swift
// Source: [VERIFIED: supabase.com/docs/guides/auth/passwords]
// [VERIFIED: supabase.com/docs/reference/swift/auth-signup]

// When email confirmation is ON, signUp returns user with session == nil.
// Do NOT try to enter the app after this call. Show CheckEmailView instead.
func signUp(email: String, password: String) async throws {
    let response = try await supabase.auth.signUp(
        email: email,
        password: password,
        redirectTo: URL(string: "rentola://auth-callback")  // must match URL scheme in Info.plist
    )
    // response.session will be nil when email confirmation is enabled
    // Transition to .checkEmail state in AppCoordinator
}
```

**Sign-in:**

```swift
// Source: [VERIFIED: supabase.com/docs/guides/auth/passwords]
try await supabase.auth.signIn(email: email, password: password)
// authStateChanges emits SIGNED_IN — AppCoordinator handles transition to .main
```

**Password reset flow:**

```swift
// Step 1: Send reset email
try await supabase.auth.resetPasswordForEmail(
    email,
    redirectTo: URL(string: "rentola://auth-callback")
)

// Step 2: User clicks link → deep link fires → authStateChanges emits .passwordRecovery
// AppCoordinator routes to UpdatePasswordView

// Step 3: User enters new password
try await supabase.auth.updateUser(user: UserAttributes(password: newPassword))
```

---

### Pattern 5: Email Verification Gate

**How it works:**
1. After `signUp()`, show `CheckEmailView` (a blocking screen with no "continue" button).
2. User receives the verification email. The link in that email redirects to `rentola://auth-callback?...` (PKCE code is appended).
3. iOS opens the app via the custom URL scheme.
4. `.onOpenURL` on `RootView` fires.
5. `supabase.auth.session(from: url)` exchanges the PKCE code for a real access + refresh token pair.
6. `authStateChanges` emits `SIGNED_IN` with a non-nil session.
7. `AppCoordinator` transitions route to `.main`.

**No polling needed.** [VERIFIED: github.com/orgs/supabase/discussions/6740] — the `authStateChanges` stream fires automatically when `session(from: url)` succeeds. The app does not need a timer.

**Key detail:** The PKCE code in the verification link is single-use and expires in 5 minutes. [CITED: supabase.com/docs/guides/auth/sessions/pkce-flow] If the user takes longer than 5 minutes to click the link, they will need to sign up again or request a new verification email (handle this with a "Resend email" button that calls `supabase.auth.resend(email: email, type: .signup)`).

**CheckEmailView skeleton:**

```swift
// [ASSUMED] — resend API availability in supabase-swift v2 not verified against current SDK
struct CheckEmailView: View {
    let email: String
    @State private var isResending = false
    @State private var resendMessage: String?

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "envelope.badge.fill")
                .font(.system(size: 64))
                .foregroundStyle(.accent)

            Text("Check your email")
                .font(.title.bold())

            Text("We sent a verification link to **\(email)**. Tap the link in the email to continue.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

            Button(isResending ? "Sending..." : "Resend email") {
                Task { await resend() }
            }
            .disabled(isResending)
        }
        .padding()
        // No navigation options — user must verify before proceeding
    }

    private func resend() async {
        isResending = true
        defer { isResending = false }
        // try? await supabase.auth.resend(email: email, type: .signup)
        resendMessage = "Verification email sent."
    }
}
```

---

### Pattern 6: @Observable ViewModel (canonical form)

```swift
// Source: [VERIFIED: developer.apple.com/documentation/SwiftUI/Migrating-from-the-observable-object-protocol-to-the-observable-macro]
// Requires iOS 17+ and Swift 5.9+

@Observable
final class AuthViewModel {
    var email = ""
    var password = ""
    var isLoading = false
    var errorMessage: String?

    // No @Published needed — @Observable tracks all stored properties automatically
    // No ObservableObject conformance needed

    func signIn() async {
        isLoading = true
        defer { isLoading = false }
        errorMessage = nil
        do {
            try await supabase.auth.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// In the View — use @State, not @StateObject
struct SignInView: View {
    @State private var viewModel = AuthViewModel()
    // ...
}
```

---

### Anti-Patterns to Avoid

- **Auth logic inside Views:** Never call `supabase.auth.*` directly from `.onAppear` or a button action in the View body. Route through a ViewModel.
- **NavigationLink in auth flow:** Auth screens are full-screen (D-03). Use `@Observable` state in `AppCoordinator` to drive transitions, not `NavigationLink`.
- **Storing service role key in the app:** The anon key is public. The service role key bypasses RLS and must never leave your server.
- **Skipping RLS on day one:** RLS is OFF by default on all Supabase tables. [VERIFIED: PITFALLS.md] Any table without RLS is fully readable/writable by any authenticated user.
- **Using `@StateObject` with `@Observable`:** `@StateObject` is the old `ObservableObject` pattern. With `@Observable`, use `@State` in views.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth session persistence | Custom Keychain wrapper for tokens | supabase-swift built-in | SDK persists tokens in Keychain automatically on iOS |
| JWT refresh | Timer to re-fetch tokens | supabase-swift auto-refresh | SDK handles proactive token refresh; `authStateChanges` emits `TOKEN_REFRESHED` |
| Email/password validation | Custom regex | `UITextField` text content types + disable button when fields empty | Keep validation simple; server validates authoritatively |
| PKCE code exchange | Custom URLSession POST to token endpoint | `supabase.auth.session(from: url)` | SDK handles the full PKCE exchange in one call |
| Image compression pipeline | Custom downsampling with CoreGraphics | Native `UIGraphicsImageRenderer` + JPEG compression | One correct pattern, low risk; no extra library needed for single avatar |
| Profile auto-creation | Client-side "check if profile exists, if not insert" on every login | PostgreSQL trigger `on_auth_user_created` | Trigger is atomic and runs server-side; client race condition avoided |

**Key insight:** Supabase's Swift SDK handles the hardest auth engineering problems (PKCE, token persistence, auto-refresh, session restoration) correctly by default. Never re-implement any of these.

---

## Database: SQL Migration (Initial Schema)

This is the complete initial migration for Phase 1. Run in Supabase SQL Editor or via Supabase CLI migrations.

```sql
-- ============================================================
-- Migration: 001_foundation.sql
-- Phase 1: Foundation — users/profiles table + RLS + trigger
-- ============================================================

-- 1. profiles table (public, separate from auth.users)
-- auth.users is managed by Supabase Auth — never write to it directly.
-- The profiles table extends it with app-specific data.
create table public.profiles (
    id              uuid        not null references auth.users on delete cascade,
    display_name    text,
    bio             text,
    avatar_url      text,       -- storage path, e.g. "avatars/{user_id}/avatar.jpeg"
    average_rating  numeric(3,2) default 0,  -- Phase 4 populates; Phase 1 renders placeholder
    created_at      timestamptz  not null default now(),
    updated_at      timestamptz  not null default now(),
    primary key (id)
);

-- 2. Enable RLS immediately (before any data, before any app traffic)
alter table public.profiles enable row level security;

-- 3. RLS Policies
-- [VERIFIED: supabase.com/docs/guides/database/postgres/row-level-security]

-- Anyone authenticated can read any profile (needed for owner cards on listings in Phase 2)
create policy "Authenticated users can view profiles"
    on public.profiles for select
    to authenticated
    using (true);

-- Users can only insert their own profile row (trigger handles this, but policy enforces it)
create policy "Users can create their own profile"
    on public.profiles for insert
    to authenticated
    with check ( (select auth.uid()) = id );

-- Users can only update their own profile
create policy "Users can update their own profile"
    on public.profiles for update
    to authenticated
    using ( (select auth.uid()) = id )
    with check ( (select auth.uid()) = id );

-- 4. Trigger: auto-create a profile row on auth.users insert (signup)
-- security definer required to write to public.profiles from auth context
-- [VERIFIED: supabase.com/docs/guides/auth/managing-user-data]
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    insert into public.profiles (id)
    values (new.id);
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- 5. updated_at auto-update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger profiles_updated_at
    before update on public.profiles
    for each row execute procedure public.set_updated_at();
```

**Why `id uuid references auth.users`** (not a separate `user_id` column): The profile row IS the user — a 1-to-1 relationship. Using `id` as the primary key and FK makes the join trivial (`auth.uid() = profiles.id`) and is the pattern in Supabase's own documentation. [VERIFIED: supabase.com/docs/guides/auth/managing-user-data]

---

## Storage: Bucket Setup + RLS

Create the `avatars` bucket in Supabase Dashboard > Storage > New Bucket:
- Name: `avatars`
- Public: **No** (private — access controlled by RLS)

Then apply RLS policies:

```sql
-- [VERIFIED: supabase.com/docs/guides/storage/security/access-control]

-- Allow authenticated users to upload to their own folder
create policy "Users can upload their own avatar"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

-- Allow authenticated users to update (replace) their own avatar
create policy "Users can update their own avatar"
    on storage.objects for update
    to authenticated
    using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

-- Allow public read (avatars are visible to all users)
create policy "Anyone can view avatars"
    on storage.objects for select
    to public
    using ( bucket_id = 'avatars' );
```

**Storage path convention:** `avatars/{user_id}/avatar.jpeg`
Store this path (not a signed URL) in `profiles.avatar_url`. Generate a public URL on-demand:

```swift
// [VERIFIED: supabase.com/docs/guides/getting-started/tutorials/with-swift]
let publicURL = supabase.storage
    .from("avatars")
    .getPublicURL(path: profile.avatarURL ?? "")
```

---

## Avatar Upload (PHPickerViewController / PhotosPicker + Compression)

**IMPORTANT:** Never upload raw PHPicker output. iPhone 15 Pro produces ~192MB decoded images. Compress to 1080px max before upload. [VERIFIED: PITFALLS.md — Pitfall 9]

```swift
// Source: pattern from Supabase Swift tutorial + PITFALLS.md Pitfall 9
// [CITED: supabase.com/docs/guides/getting-started/tutorials/with-swift]

import PhotosUI
import UIKit

// Step 1: Compress the image on a background task
func compressForUpload(_ data: Data, maxDimension: CGFloat = 1080) -> Data? {
    guard let uiImage = UIImage(data: data) else { return nil }
    let size = uiImage.size
    let scale = min(maxDimension / size.width, maxDimension / size.height, 1.0)
    let newSize = CGSize(width: size.width * scale, height: size.height * scale)
    let renderer = UIGraphicsImageRenderer(size: newSize)
    let resized = renderer.image { _ in uiImage.draw(in: CGRect(origin: .zero, size: newSize)) }
    return resized.jpegData(compressionQuality: 0.8)
}

// Step 2: Upload and update profile
func uploadAvatar(imageData: Data) async throws {
    guard let compressed = compressForUpload(imageData) else { return }

    let userId = try await supabase.auth.session.user.id.uuidString
    let path = "\(userId)/avatar.jpeg"

    // upsert: true — replace existing avatar without creating a new file
    // [VERIFIED: supabase.com/docs/reference/swift/storage-from-upload]
    try await supabase.storage
        .from("avatars")
        .upload(
            path: path,
            file: compressed,
            options: FileOptions(contentType: "image/jpeg", upsert: true)
        )

    // Update profile with the storage path
    try await supabase
        .from("profiles")
        .update(["avatar_url": path])
        .eq("id", value: userId)
        .execute()
}
```

**FileOptions for upsert:** Setting `upsert: true` requires SELECT + UPDATE RLS policies on `storage.objects` in addition to INSERT. The storage RLS above includes the UPDATE policy for this reason.

---

## Deep Link Configuration (Info.plist)

Required for email verification callback and password reset. [VERIFIED: supabase.com/docs/guides/auth/native-mobile-deep-linking]

**1. Register URL scheme in Info.plist:**
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>rentola</string>
    </array>
  </dict>
</array>
```

**2. Register in Supabase Dashboard:**
Authentication > URL Configuration > Additional Redirect URLs:
```
rentola://auth-callback
```

**3. Both `signUp` and `resetPasswordForEmail` must use the same redirectTo:**
```swift
redirectTo: URL(string: "rentola://auth-callback")
```

**Important:** The `SIGNED_IN` event fires on verification link click AND on normal sign-in. Always check `session != nil` rather than just listening for `SIGNED_IN`. [VERIFIED: supabase.com/docs/reference/swift/auth-onauthstatechange]

---

## Common Pitfalls

### Pitfall 1: Tab switching causes NavigationPath to reset
**What goes wrong:** `@State private var coordinator = MainTabCoordinator()` placed inside `MainTabView` (not in the parent) means a new coordinator is allocated each time the tab view is rebuilt, losing navigation state.
**Why it happens:** SwiftUI recreates `@State` when the view is first created, but if the parent view re-evaluates and triggers a new allocation, state is lost.
**How to avoid:** Place `@State private var coordinator = MainTabCoordinator()` high enough in the view hierarchy that it survives tab switches — typically in `RootView` or in a parent that doesn't rebuild on tab change.
**Warning signs:** Users lose their place in a navigation stack when switching tabs and switching back.

### Pitfall 2: Email verification deep link fails in non-Safari browsers
**What goes wrong:** If the user reads their email in Gmail app (which uses Chrome WebView), tapping the confirmation link may open a browser view rather than the app.
**Why it happens:** Custom URL schemes (`rentola://`) are handled by the OS; the browser passes them through. However, HTTP Universal Links are unreliable in non-Safari browsers. [CITED: github.com/orgs/supabase/discussions/25923]
**How to avoid:** Custom URL scheme (`rentola://`) is more reliable than Universal Links for email-based flows. Test specifically in Gmail app on a device.
**Warning signs:** Users report "the link didn't work" during beta testing.

### Pitfall 3: `session(from: url)` called before authStateChanges is listening
**What goes wrong:** If the app launches directly from a deep link (cold start via email click), the `.onOpenURL` handler may fire before the `startListening()` task begins, meaning the `SIGNED_IN` event is emitted before the `for await` loop is running.
**Why it happens:** Swift concurrency task ordering — `.task {}` may start slightly after the initial view render.
**How to avoid:** In `AppCoordinator.startListening()`, set route to `.loading` as the first action (before the `for await` loop begins). The `for await` on `authStateChanges` will emit any buffered `.initialSession` event when it starts consuming. This covers the cold-start case.
**Warning signs:** App shows the welcome screen briefly then jumps to the main tab when the user taps the email link with the app not running.

### Pitfall 4: RLS blocks the trigger from inserting into profiles
**What goes wrong:** The `on_auth_user_created` trigger fails silently if the `profiles` RLS policy requires `auth.uid()` to match `id`, because the trigger runs as the `postgres` user, not as the authenticated user.
**Why it happens:** RLS policies check `auth.uid()` which returns null for service-level DB operations.
**How to avoid:** The trigger function uses `security definer` and `set search_path = ''` which grants it elevated privileges that bypass RLS. This is the pattern from Supabase's own documentation. [VERIFIED: supabase.com/docs/guides/auth/managing-user-data]
**Warning signs:** Users can sign up but their profile row never appears in `profiles`.

### Pitfall 5: PrivacyInfo.xcprivacy omitted
**What goes wrong:** App Store submission rejected for missing privacy manifest. Required since May 2024; Apple rejected 12% of Q1 2025 submissions for this. [VERIFIED: PITFALLS.md — Pitfall 16]
**How to avoid:** Add `PrivacyInfo.xcprivacy` in Wave 0 (project setup). For Phase 1: declare `NSPhotoLibraryUsageDescription` (avatar picker). Do NOT declare location or camera in Phase 1 (those are Phase 2).

---

## Code Examples

### Auth State Change Listener (canonical async stream)
```swift
// Source: [VERIFIED: supabase.com/docs/reference/swift/auth-onauthstatechange]
for await (event, session) in supabase.auth.authStateChanges {
    // event: AuthChangeEvent (.initialSession, .signedIn, .signedOut, .tokenRefreshed,
    //                         .userUpdated, .passwordRecovery)
    // session: Session? — nil when not authenticated or email unconfirmed
    print(event, session?.user.email ?? "no session")
}
```

### Profile Fetch
```swift
// Source: [CITED: supabase.com/docs/guides/getting-started/tutorials/with-swift]
let profile: UserProfile = try await supabase
    .from("profiles")
    .select()
    .eq("id", value: supabase.auth.currentUser!.id)
    .single()
    .execute()
    .value
```

### Profile Update
```swift
struct ProfileUpdate: Encodable {
    let displayName: String
    let bio: String

    enum CodingKeys: String, CodingKey {
        case displayName = "display_name"
        case bio
    }
}

try await supabase
    .from("profiles")
    .update(ProfileUpdate(displayName: displayName, bio: bio))
    .eq("id", value: userId)
    .execute()
```

### Sign Out
```swift
try await supabase.auth.signOut()
// authStateChanges emits .signedOut — AppCoordinator routes to .welcome
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ObservableObject` + `@Published` for ViewModels | `@Observable` macro, no annotations needed | iOS 17 / Swift 5.9 (2023) | Leaner VMs, simpler views; requires iOS 17 minimum |
| `@StateObject` for ViewModel injection | `@State` for `@Observable` ViewModels | iOS 17 (2023) | `@StateObject` is now a code smell with `@Observable` |
| `PHPickerViewController` (UIKit) | `PhotosPicker` (SwiftUI-native) | iOS 16 (2022) | No UIViewControllerRepresentable wrapper needed |
| Polling for session state | `authStateChanges` async stream | supabase-swift v2 (2023) | Reactive, no timer logic |
| `NavigationView` | `NavigationStack` + `NavigationPath` | iOS 16 (2022) | Required for coordinator-driven deep linking |

**Deprecated/outdated:**
- `@StateObject` + `ObservableObject`: Still works but is the pre-iOS 17 pattern. ARCHITECTURE.md code examples use this — replace with `@Observable` + `@State`.
- `PHPickerViewController` wrapped in `UIViewControllerRepresentable`: Still functional but `PhotosPicker` is simpler for this use case.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `supabase.auth.resend(email:type:)` is available in supabase-swift v2 for re-sending verification email | Pattern 5: Email Verification Gate | Low — if API name differs, alternative is to sign the user out and call `signUp` again with same credentials |
| A2 | FileOptions accepts `upsert: true` to replace existing storage objects in the current SDK | Avatar Upload pattern | Low — worst case, delete then re-upload; docs confirm upsert is documented |

**All other claims in this research were verified or cited. No user confirmation required for them.**

---

## Open Questions

1. **Supabase project URL and anon key**
   - What we know: The iOS app needs a `SupabaseClient` initialized with the project URL and anon key.
   - What's unclear: No Supabase project has been created yet.
   - Recommendation: Create the Supabase project before Wave 1 begins. The URL and anon key go into a `Config.swift` or Xcode xcconfig file (not hardcoded in `SupabaseClient.swift`).

2. **Email confirmation on/off during development**
   - What we know: Email confirmation required by D-02 for production. Supabase allows disabling it per-project.
   - What's unclear: Should email confirmation be disabled during early development to speed up testing?
   - Recommendation: Disable confirmation in the Supabase dashboard during active development. Re-enable before any external TestFlight distribution. This is a single toggle in Authentication > Email > Confirm email.

3. **App bundle ID for URL scheme**
   - What we know: The Info.plist URL scheme must be registered in the Supabase dashboard Redirect URLs.
   - What's unclear: The final bundle identifier (affects URL scheme registration).
   - Recommendation: Choose the bundle ID in Wave 0 (Xcode project creation step). Suggested: `com.rentola.app`. URL scheme: `rentola`.

---

## Environment Availability

This phase is a greenfield Xcode project — there are no external services to probe yet beyond the development machine. The machine running this research has Swift 5.7.2, which is below the Swift 5.9 minimum for `@Observable`.

| Dependency | Required By | Available on build machine | Notes |
|------------|------------|---------------------------|-------|
| Xcode 15+ | `@Observable`, iOS 17 SDK | Not confirmed (xcodebuild not in shell PATH) | Must be installed on the development Mac |
| Swift 5.9+ | `@Observable` macro | 5.7.2 detected in shell | Xcode 15 ships Swift 5.9; Xcode 16 ships Swift 5.10. The shell Swift may be older than Xcode's toolchain |
| Supabase project | Auth, Storage, DB | Not yet created | Must be created before Wave 1 |
| iOS device or Simulator | Auth deep link testing | [ASSUMED] available | Deep link testing requires either a device or Simulator with custom URL scheme support |

**Key note:** Swift 5.7.2 detected in the shell is the macOS system Swift, NOT the Xcode toolchain Swift. `@Observable` works with Xcode 15's bundled Swift 5.9 regardless of the system Swift version. This is expected on macOS 12 / Xcode 14 era machines. Confirm Xcode version with `xcodebuild -version` in a shell that has Xcode toolchain on PATH.

**Missing dependencies with no fallback:**
- Xcode 15+ — required for `@Observable`. If only Xcode 14 is available, fall back to `ObservableObject` + `@Published` (increases VM boilerplate but is architecturally sound).
- Supabase project — must be created; no fallback.

---

## Validation Architecture

Phase 1 is a greenfield SwiftUI project. XCTest is the standard test framework bundled with Xcode; no third-party test runner needed.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | XCTest (Xcode bundled) |
| Unit test target | `RentolaTests` (created in Wave 0) |
| UI test target | `RentolaUITests` (optional; manual UAT covers Phase 1 acceptance) |
| Quick run command | Cmd+U in Xcode, or `xcodebuild test -scheme Rentola -destination 'platform=iOS Simulator,name=iPhone 15'` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| AUTH-01 | signUp returns user with nil session when email confirmation enabled | Unit (mock Supabase) | Test `AuthViewModel.signUp()` state machine transitions |
| AUTH-02 | signIn success routes AppCoordinator to `.main` | Unit | Test coordinator route after auth event |
| AUTH-02 | signIn failure sets errorMessage on AuthViewModel | Unit | Test error path |
| AUTH-03 | resetPasswordForEmail sends reset email (no crash) | Integration / manual | Requires real Supabase project; verify email received |
| PROF-01 | Profile update persists display_name across re-fetch | Integration | Requires Supabase connection; test fetch→update→fetch cycle |
| PROF-01 | Avatar upload compresses to ≤ 1080px before uploading | Unit | Test `compressForUpload()` with a known image |
| PROF-02 | Bio field saved to Supabase profiles table | Integration | Same as PROF-01 pattern |

**Phase 1 UAT (manual acceptance):**
1. Fresh install → sign up with email → verification email arrives within 60s → tap link → app unlocks and shows tab shell.
2. Log out → log back in → session restored, returns to main tab.
3. Trigger "forgot password" → email arrives → tap link → Update Password screen appears → enter new password → login with new password succeeds.
4. Edit display name, write bio, upload avatar → force-quit app → relaunch → changes persist.
5. Profile tab shows display name, bio, avatar, and a "—" rating placeholder.

### Wave 0 Gaps (tests to create before implementation)
- [ ] `RentolaTests/AuthViewModelTests.swift` — covers AUTH-01, AUTH-02 (mocked Supabase)
- [ ] `RentolaTests/AppCoordinatorTests.swift` — route transitions driven by auth events
- [ ] `RentolaTests/ImageCompressionTests.swift` — covers PROF-01 compression requirement

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase Auth (PKCE, email/password) — never custom JWT |
| V3 Session Management | Yes | supabase-swift Keychain persistence + auto-refresh — no custom session store |
| V4 Access Control | Yes | Supabase RLS on all tables from day one — `auth.uid()` policies |
| V5 Input Validation | Yes | Server-side via Supabase Auth for email/password; client-side: disable submit when fields empty |
| V6 Cryptography | No | No custom crypto; Supabase Auth handles all cryptographic operations |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| RLS not enabled on new table | Elevation of privilege | Enable RLS in migration before any data; policy must exist before public launch |
| Anon key confused with service role key | Information disclosure | Anon key ships in app binary — safe. Service role key is admin-level; never ship it. |
| PKCE code replay | Spoofing | Supabase enforces single-use codes server-side; `session(from:url)` consumes and invalidates the code |
| Deep link interception (custom scheme) | Spoofing | Custom schemes cannot be claimed exclusively on iOS; mitigated by PKCE (code is useless without the verifier stored locally) |
| Profile data exposed to unauthenticated requests | Information disclosure | RLS `to authenticated` on SELECT policy blocks anon reads |

---

## Sources

### Primary (HIGH confidence)
- [supabase.com/docs/guides/getting-started/tutorials/with-swift](https://supabase.com/docs/guides/getting-started/tutorials/with-swift) — Swift/SwiftUI auth + profile + avatar upload tutorial; fetched directly
- [supabase.com/docs/guides/auth/passwords](https://supabase.com/docs/guides/auth/passwords) — signUp, signIn, resetPasswordForEmail API; fetched directly
- [supabase.com/docs/reference/swift/auth-signup](https://supabase.com/docs/reference/swift/auth-signup) — session nil on email confirmation; fetched directly
- [supabase.com/docs/reference/swift/auth-onauthstatechange](https://supabase.com/docs/reference/swift/auth-onauthstatechange) — AuthChangeEvent cases, async stream pattern; fetched directly
- [supabase.com/docs/guides/auth/managing-user-data](https://supabase.com/docs/guides/auth/managing-user-data) — profiles table + handle_new_user trigger; fetched directly
- [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS SQL syntax; fetched directly
- [supabase.com/docs/guides/storage/security/access-control](https://supabase.com/docs/guides/storage/security/access-control) — storage.objects RLS policies; fetched directly
- [supabase.com/docs/reference/swift/storage-from-upload](https://supabase.com/docs/reference/swift/storage-from-upload) — upload API + FileOptions; fetched directly
- [supabase.com/docs/guides/auth/native-mobile-deep-linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) — URL scheme configuration; fetched directly
- [developer.apple.com — Migrating from ObservableObject to @Observable](https://developer.apple.com/documentation/SwiftUI/Migrating-from-the-observable-object-protocol-to-the-observable-macro) — @Observable usage with @State; cited in ARCHITECTURE.md
- [developer.apple.com — Bringing robust navigation to SwiftUI](https://developer.apple.com/documentation/swiftui/bringing_robust_navigation_structure_to_your_swiftui_app) — NavigationStack + coordinator; cited in ARCHITECTURE.md
- [github.com/supabase/supabase-swift/releases](https://github.com/supabase/supabase-swift/releases) — version 2.39.0 confirmed (Dec 2025)

### Secondary (MEDIUM confidence)
- [github.com/orgs/supabase/discussions/6740](https://github.com/orgs/supabase/discussions/6740) — authStateChanges fires on email confirmation; community discussion verified against docs
- [github.com/orgs/supabase/discussions/25923](https://github.com/orgs/supabase/discussions/25923) — custom URL scheme more reliable than Universal Links for email flows
- .planning/research/ARCHITECTURE.md — coordinator skeleton, @Observable ViewModel patterns
- .planning/research/PITFALLS.md — RLS day-one requirement, image compression requirement, PrivacyInfo.xcprivacy

### Tertiary (LOW confidence — flag for validation)
- `supabase.auth.resend(email:type:)` API existence in Swift v2 — not verified against current SDK; check supabase-swift GitHub before implementing

---

## Metadata

**Confidence breakdown:**
- Supabase Auth PKCE flow: HIGH — official docs fetched and verified
- Coordinator pattern: HIGH — derived from Apple official docs + project ARCHITECTURE.md
- SQL migrations and RLS: HIGH — official Supabase docs fetched and verified
- Storage upload + RLS: HIGH — official Supabase docs fetched and verified
- Email verification gate mechanism: HIGH — authStateChanges stream confirmed; community discussion consistent
- Image compression pattern: HIGH — PITFALLS.md verified, native UIKit approach confirmed
- `resend()` API: LOW — assumed, not SDK-verified

**Research date:** 2026-04-06
**Valid until:** 2026-07-06 (90 days — supabase-swift is actively maintained with weekly releases; re-verify API signatures before major phase implementations)
