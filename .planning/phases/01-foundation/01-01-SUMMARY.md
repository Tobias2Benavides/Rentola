---
phase: 01-foundation
plan: 01
subsystem: auth-and-shell
tags: [xcode, swiftui, coordinator, auth, supabase, rls, mvvm]
dependency_graph:
  requires: []
  provides:
    - AppCoordinator with AppRoute (loading/welcome/checkEmail/updatePassword/main)
    - MainTabCoordinator with 4 per-tab coordinators (Browse/Renting/Listing/Profile)
    - SupabaseClient singleton
    - AuthViewModel (signUp/signIn/resetPassword/updatePassword/signOut)
    - profiles table with RLS + handle_new_user trigger
    - rentola:// URL scheme for PKCE deep links
  affects: []
tech_stack:
  added:
    - supabase-swift 2.0.0+ (SPM, umbrella package — Auth, Storage, PostgREST)
  patterns:
    - MVVM + Coordinator (@Observable classes, not ObservableObject)
    - AppCoordinator drives root routing via authStateChanges async stream
    - Per-tab NavigationPath coordinators for isolated navigation state
    - Supabase PKCE auth with email verification gate
    - RLS enabled from day one on all tables
key_files:
  created:
    - Rentola/App/RentolaApp.swift
    - Rentola/App/AppCoordinator.swift
    - Rentola/Features/Auth/WelcomeView.swift
    - Rentola/Features/Auth/SignUpView.swift
    - Rentola/Features/Auth/SignInView.swift
    - Rentola/Features/Auth/ForgotPasswordView.swift
    - Rentola/Features/Auth/CheckEmailView.swift
    - Rentola/Features/Auth/UpdatePasswordView.swift
    - Rentola/Features/Auth/AuthViewModel.swift
    - Rentola/Features/Main/MainTabView.swift
    - Rentola/Features/Main/MainTabCoordinator.swift
    - Rentola/Features/Browse/BrowseCoordinator.swift
    - Rentola/Features/Browse/BrowsePlaceholderView.swift
    - Rentola/Features/Renting/RentingCoordinator.swift
    - Rentola/Features/Renting/RentingPlaceholderView.swift
    - Rentola/Features/Listing/ListingCoordinator.swift
    - Rentola/Features/Listing/ListingPlaceholderView.swift
    - Rentola/Features/Profile/ProfileCoordinator.swift
    - Rentola/Features/Profile/ProfilePlaceholderView.swift
    - Rentola/Services/SupabaseClient.swift
    - Rentola/Models/UserProfile.swift
    - Rentola/Resources/Info.plist
    - Rentola/Resources/PrivacyInfo.xcprivacy
    - Rentola.xcodeproj/project.pbxproj
    - supabase/migrations/001_foundation.sql
    - supabase/config.toml
  modified: []
decisions:
  - "Used NavigationStack with navigationDestination(isPresented:) in WelcomeView to push SignUpView/SignInView as full-screen destinations (D-03) — avoids sheets"
  - "ProfilePlaceholderView created in addition to plan-listed files — required by MainTabView reference"
  - "Supabase config.toml created with rentola://auth-callback in redirect URLs for local dev reference"
  - "supabase db push not executed — Supabase CLI not installed and no SUPABASE_ACCESS_TOKEN set; documented as user setup step"
metrics:
  duration_minutes: ~45
  completed_date: "2026-04-06"
  tasks_completed: 2
  tasks_total: 3
  files_created: 26
  files_modified: 0
---

# Phase 1 Plan 1: Xcode Project + Auth Shell Summary

**One-liner:** SwiftUI iOS 17 Xcode project with MVVM+Coordinator skeleton (AppCoordinator + 4-tab shell), Supabase PKCE email/password auth flows, and PostgreSQL migration with profiles table RLS.

## What Was Built

### Task 1: Xcode project + Coordinator skeleton + Tab shell + Supabase client

Created the complete Xcode project structure for `Rentola`:

- **`Rentola.xcodeproj`** — Full project file with supabase-swift SPM dependency (`from: "2.0.0"`), iOS 17.0 deployment target, bundle ID `com.rentola.app`, Debug/Release build configurations for main target + test targets (RentolaTests, RentolaUITests)
- **`AppCoordinator`** — `@Observable final class` with `AppRoute` enum (`loading`, `welcome`, `checkEmail(email:)`, `updatePassword`, `main`). Iterates `supabase.auth.authStateChanges` to route the app. `.loading` prevents launch flicker.
- **`MainTabCoordinator`** — `@Observable final class` owning `Tab` enum with 4 cases (`browse`, `renting`, `listing`, `profile`) each with `label` and `systemImage` (SF Symbols: `magnifyingglass`, `key.fill`, `tag.fill`, `person.circle.fill` per D-04). Owns 4 per-tab coordinators.
- **4 per-tab coordinators** — Each `@Observable final class` with `var path = NavigationPath()`, empty `Destination: Hashable` enum, and `push/pop/popToRoot` methods.
- **`MainTabView`** — `TabView(selection: $coordinator.selectedTab)` with 4 `NavigationStack(path:)` tabs, each bound to its coordinator's path and tagged with the `Tab` enum case.
- **`WelcomeView`** — Airbnb-style branded landing screen (D-01) with "Rentola" bold title, tagline, and two prominent buttons ("Create Account" filled primary, "Sign In" outlined secondary). NavigationStack wraps the auth flow.
- **Placeholder views** — `BrowsePlaceholderView`, `RentingPlaceholderView`, `ListingPlaceholderView`, `ProfilePlaceholderView` — each with consistent SF Symbol icon + empty state text (D-07).
- **`SupabaseClient.swift`** — Top-level singleton `let supabase = SupabaseClient(...)` with TODO placeholder values.
- **`RentolaApp.swift`** — `@main` with `@State private var coordinator = AppCoordinator()`, Group switching on `coordinator.route`, `.onOpenURL` for PKCE deep link handling (on root Group — per research Pattern 5), `.task { await coordinator.startListening() }`.
- **`Info.plist`** — URL scheme `rentola` registered via `CFBundleURLTypes`.
- **`PrivacyInfo.xcprivacy`** — Minimal privacy manifest with no tracking, no collected data types, no accessed API types in Phase 1.

### Task 2: Auth flows + database migration

- **`AuthViewModel`** — `@Observable final class` with `signUp(coordinator:)`, `signIn()`, `resetPassword()`, `updatePassword(newPassword:)`, `signOut()`. All methods use `defer { isLoading = false }` pattern. `signUp` calls `supabase.auth.signUp(email:password:redirectTo:)` with `rentola://auth-callback` redirect. `updatePassword` calls `supabase.auth.update(user: UserAttributes(password:))`.
- **`SignUpView`** — Full-screen (D-03) with email TextField (`.emailAddress` content type, `.never` autocapitalization), password SecureField (`.newPassword`), confirm password SecureField. Submit disabled when fields empty, passwords don't match, or loading. Inline error display.
- **`SignInView`** — Full-screen (D-03) with email/password fields. "Forgot Password?" button navigates to `ForgotPasswordView` via `navigationDestination(isPresented:)`. Submit disabled when fields empty or loading.
- **`ForgotPasswordView`** — Email field + "Send Reset Link" button. On success, shows green confirmation banner: "Check your email for a reset link." `errorMessage == nil` check gates the `resetSent = true` transition.
- **`CheckEmailView`** — Blocking gate (D-02) with `envelope.badge.fill` icon at size 64, "Check your email" title, body text with bold email address interpolation, "Resend email" button calling `supabase.auth.resend(email:type:.signup)`. No navigation away — app transitions automatically when PKCE deep link fires.
- **`UpdatePasswordView`** — New password + confirm fields. Submit disabled when fields don't match or loading. AppCoordinator handles transition to `.main` via `authStateChanges`.
- **`UserProfile`** — `struct UserProfile: Codable, Identifiable` with `id`, `displayName`, `bio`, `avatarURL`, `averageRating`, `createdAt`, `updatedAt` and CodingKeys mapping snake_case DB columns.
- **`supabase/migrations/001_foundation.sql`** — Complete migration: `profiles` table with 7 columns, RLS enabled, 3 profile RLS policies (SELECT/INSERT/UPDATE), `handle_new_user()` trigger (security definer), `set_updated_at()` trigger, storage bucket insert for `avatars`, 3 storage RLS policies (INSERT/UPDATE/SELECT).
- **`supabase/config.toml`** — Supabase CLI config with `rentola://auth-callback` in `additional_redirect_urls`.

## Deviations from Plan

### Auto-added: ProfilePlaceholderView

- **Found during:** Task 1 — `MainTabView` requires a view for the Profile tab
- **Issue:** Plan listed `ProfileCoordinator.swift` but no `ProfilePlaceholderView.swift` in Task 1's file list. `MainTabView` must display something in the Profile tab.
- **Fix:** Created `Rentola/Features/Profile/ProfilePlaceholderView.swift` with consistent empty state pattern matching other placeholder views
- **Files modified:** `Rentola/Features/Profile/ProfilePlaceholderView.swift` (created)
- **Commit:** b47200e

### Auth gate: supabase db push not executed

- **Found during:** Task 2
- **Issue:** Supabase CLI not installed on this machine. `SUPABASE_ACCESS_TOKEN`, `SUPABASE_URL`, and Supabase project do not exist yet (per `user_setup` in plan frontmatter).
- **Status:** Migration file is complete and correct. Schema push is a user action — requires completing the `user_setup` steps in the plan frontmatter before Task 3 verification.
- **Action required:** See User Setup section below.

## User Setup Required Before Verification (Task 3)

The following must be completed before opening Xcode and running the app:

1. **Create a Supabase project** at supabase.com > New Project
2. **Add redirect URL** in Supabase Dashboard > Authentication > URL Configuration > Additional Redirect URLs: `rentola://auth-callback`
3. **Enable email confirmation** in Supabase Dashboard > Authentication > Email > toggle "Confirm email"
4. **Copy credentials** from Supabase Dashboard > Project Settings > API:
   - Project URL (`https://YOUR_PROJECT_REF.supabase.co`)
   - anon/public key
5. **Update `Rentola/Services/SupabaseClient.swift`** with the actual URL and anon key
6. **Push the migration** — install Supabase CLI then:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```
7. **Add supabase-swift SPM package** in Xcode: File > Add Package Dependencies > `https://github.com/supabase/supabase-swift` (from 2.0.0)

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `Rentola/Services/SupabaseClient.swift` | `"https://YOUR_PROJECT_REF.supabase.co"`, `"YOUR_ANON_KEY"` | Requires user to supply actual Supabase project credentials (user_setup step) |

## Threat Surface Scan

No new threat surfaces beyond those documented in the plan's threat model. Key mitigations implemented:

- T-01-04 (RLS not enabled): `alter table public.profiles enable row level security` is the second statement in the migration, before any data
- T-01-05 (service role key in binary): No service_role key in any Swift file — confirmed with grep
- T-01-06 (profile tampering): UPDATE RLS policy enforces `auth.uid() = id`
- T-01-08 (unauthenticated access): SELECT policy is `to authenticated` only

## Self-Check

### Files exist

- [x] `Rentola/App/RentolaApp.swift` — FOUND
- [x] `Rentola/App/AppCoordinator.swift` — FOUND
- [x] `Rentola/Features/Auth/WelcomeView.swift` — FOUND
- [x] `Rentola/Features/Auth/AuthViewModel.swift` — FOUND
- [x] `Rentola/Features/Auth/SignUpView.swift` — FOUND
- [x] `Rentola/Features/Auth/SignInView.swift` — FOUND
- [x] `Rentola/Features/Auth/ForgotPasswordView.swift` — FOUND
- [x] `Rentola/Features/Auth/CheckEmailView.swift` — FOUND
- [x] `Rentola/Features/Auth/UpdatePasswordView.swift` — FOUND
- [x] `Rentola/Features/Main/MainTabView.swift` — FOUND
- [x] `Rentola/Features/Main/MainTabCoordinator.swift` — FOUND
- [x] `Rentola/Features/Browse/BrowseCoordinator.swift` — FOUND
- [x] `Rentola/Features/Browse/BrowsePlaceholderView.swift` — FOUND
- [x] `Rentola/Features/Renting/RentingCoordinator.swift` — FOUND
- [x] `Rentola/Features/Renting/RentingPlaceholderView.swift` — FOUND
- [x] `Rentola/Features/Listing/ListingCoordinator.swift` — FOUND
- [x] `Rentola/Features/Listing/ListingPlaceholderView.swift` — FOUND
- [x] `Rentola/Features/Profile/ProfileCoordinator.swift` — FOUND
- [x] `Rentola/Features/Profile/ProfilePlaceholderView.swift` — FOUND
- [x] `Rentola/Services/SupabaseClient.swift` — FOUND
- [x] `Rentola/Models/UserProfile.swift` — FOUND
- [x] `Rentola/Resources/Info.plist` — FOUND
- [x] `Rentola/Resources/PrivacyInfo.xcprivacy` — FOUND
- [x] `supabase/migrations/001_foundation.sql` — FOUND
- [x] `Rentola.xcodeproj/project.pbxproj` — FOUND

### Commits exist

- [x] b47200e — feat(01-01): Xcode project skeleton with coordinator hierarchy and tab shell
- [x] 95bb8c0 — feat(01-01): auth flows, UserProfile model, and database migration

## Self-Check: PASSED
