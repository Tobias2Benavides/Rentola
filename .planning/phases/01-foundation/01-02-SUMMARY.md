---
phase: 01-foundation
plan: 02
subsystem: profile
tags: [swiftui, profile, supabase-storage, photos, avatar, mvvm, observable]
dependency_graph:
  requires:
    - 01-01 (AppCoordinator, MainTabCoordinator, SupabaseClient, UserProfile model, profiles table RLS)
  provides:
    - ProfileViewModel (loadProfile, saveProfile, uploadAvatar, avatarPublicURL, signOut)
    - ProfileView (read-only profile screen in Profile tab)
    - EditProfileView (edit display name, bio, avatar via PhotosPicker)
  affects:
    - MainTabView (Profile tab now renders ProfileView)
tech_stack:
  added:
    - PhotosUI (PhotosPicker, PhotosPickerItem) — iOS 16+ built-in, avatar selection
    - UIGraphicsImageRenderer — image compression before upload
  patterns:
    - ProfileViewModel as @Observable class, passed by reference to EditProfileView
    - AsyncImage for avatar display with graceful fallback placeholder
    - compressForUpload pattern: resize to max 1080px then JPEG at 0.8 quality (mitigates T-02-03)
    - PhotosPicker .onChange triggers uploadAvatar async task
    - NavigationLink in toolbar for Edit Profile flow (no coordinator push needed for Phase 1)
key_files:
  created:
    - Rentola/Features/Profile/ProfileViewModel.swift
    - Rentola/Features/Profile/ProfileView.swift
    - Rentola/Features/Profile/EditProfileView.swift
  modified:
    - Rentola/Features/Main/MainTabView.swift
decisions:
  - "ProfileViewModel passed by reference (not @Binding) to EditProfileView — both screens share the same instance, so saves and avatar uploads reflect immediately in ProfileView on dismiss"
  - "NavigationLink in toolbar used for Edit Profile navigation — simpler than coordinator push for Phase 1 single destination"
  - "Bio capped at 300 characters with live counter in EditProfileView — enforced client-side via .onChange"
  - "Avatar stored at {userId}/avatar.jpeg with upsert:true — Storage INSERT policy enforces folder ownership (T-02-04)"
metrics:
  duration_minutes: ~5
  completed_date: "2026-04-06"
  tasks_completed: 1
  tasks_total: 2
  files_created: 3
  files_modified: 1
---

# Phase 1 Plan 2: User Profile Summary

**One-liner:** ProfileViewModel + ProfileView + EditProfileView with PhotosPicker avatar upload (compressed to max 1080px/JPEG 0.8) wired into the Profile tab via MainTabView.

## What Was Built

### Task 1: ProfileViewModel + ProfileView + EditProfileView with avatar upload

**`ProfileViewModel.swift`** — `@Observable final class` driving both ProfileView and EditProfileView:

- `loadProfile()` — fetches the authenticated user's row from `profiles` table via PostgREST `.single()`, populates editable fields
- `saveProfile()` — updates `display_name` and `bio` columns via PostgREST UPDATE, then refreshes profile
- `uploadAvatar(from:)` — loads `PhotosPickerItem` as `Data`, compresses via `compressForUpload()`, uploads to `avatars/{userId}/avatar.jpeg` with `upsert: true` and `contentType: "image/jpeg"`, updates `avatar_url` on profile row
- `compressForUpload(_:maxDimension:)` — resizes to max 1080px on longest side using `UIGraphicsImageRenderer`, encodes as JPEG at 0.8 quality (mitigates T-02-03: prevents raw PHPicker data from being uploaded)
- `avatarPublicURL()` — returns public CDN URL from Supabase Storage for `AsyncImage`
- `isProfileIncomplete` — computed property: true when `displayName` or `avatarURL` is nil/empty
- `signOut()` — calls `supabase.auth.signOut()`; `AppCoordinator.authStateChanges` handles the transition to welcome screen

**`ProfileView.swift`** — Read-only profile screen in the Profile tab:

- 100pt avatar circle: `AsyncImage` when `avatarPublicURL()` is non-nil, SF Symbol `person.circle.fill` in gray circle as placeholder
- Display name in `.title2.bold()`; shows "Set up your profile" in secondary color when nil/empty (PROF-01)
- Bio in `.body` with secondary foreground; shows "Add a bio..." in tertiary color when nil/empty (PROF-02)
- Rating section: `star.fill` SF Symbol + `averageRating` value formatted to 1 decimal, or "No reviews yet" when `averageRating == 0` — field ready for Phase 4 (PROF-03)
- Profile completion prompt card shown when `isProfileIncomplete == true` per D-06: blue-tinted card with "Complete your profile" copy and "Edit Profile" NavigationLink
- "Edit Profile" toolbar button as `NavigationLink` to `EditProfileView`
- "Sign Out" destructive button at the bottom; triggers `viewModel.signOut()` async task

**`EditProfileView.swift`** — Edit form accepting `viewModel: ProfileViewModel` by reference:

- `PhotosPicker(selection: $viewModel.selectedPhotoItem, matching: .images)` overlay on avatar circle with camera badge
- `.onChange(of: viewModel.selectedPhotoItem)` triggers `viewModel.uploadAvatar(from:)` as async Task
- Display name `TextField` bound to `viewModel.editDisplayName`
- Bio `TextEditor` bound to `viewModel.editBio` with 300-character limit enforced via `.onChange` and live counter display
- Loading overlay (`ProgressView` in pill background) shown while `viewModel.isSaving`
- Save button calls `viewModel.saveProfile()` then `dismiss()` on success
- Cancel button in leading toolbar dismisses without saving

**`MainTabView.swift`** — Profile tab updated: `ProfilePlaceholderView()` replaced with `ProfileView()`.

## Threat Mitigations Applied

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-02-01 Tampering — another user modifying someone else's profile | RLS UPDATE policy `auth.uid() = id` enforced in migration 001; PostgREST respects RLS | Pre-existing (migration 001) |
| T-02-03 DoS — uploading extremely large image | `compressForUpload()` resizes to max 1080px and compresses to JPEG 0.8 BEFORE upload | Implemented in ProfileViewModel |
| T-02-04 EoP — uploading to another user's avatar folder | Storage INSERT policy `(storage.foldername(name))[1] = auth.uid()::text` (migration 001) | Pre-existing (migration 001) |
| T-02-05 Spoofing — updating profile without valid session | Supabase PostgREST requires valid JWT; RLS checks `auth.uid()` | Pre-existing (Supabase infra) |

## Deviations from Plan

None — plan executed exactly as written. All four files created/modified match the specification. `compressForUpload` is implemented as a private method (matching the plan's visibility choice). Avatar upload uses `upsert: true` as specified. PROF-03 rating placeholder renders exactly "No reviews yet" when `averageRating == 0`.

## Known Stubs

None. All data flows are wired to real Supabase calls. Avatar URL resolves via `supabase.storage.from("avatars").getPublicURL(path:)` — will display correctly once the user has uploaded an avatar.

Note: The Supabase credentials placeholder from Plan 01-01 (`SupabaseClient.swift`) is a pre-existing user setup step — not a stub introduced by this plan.

## Self-Check

### Files exist

- [x] `Rentola/Features/Profile/ProfileViewModel.swift` — FOUND
- [x] `Rentola/Features/Profile/ProfileView.swift` — FOUND
- [x] `Rentola/Features/Profile/EditProfileView.swift` — FOUND
- [x] `Rentola/Features/Main/MainTabView.swift` — FOUND (modified)

### Commits exist

- [x] 641f835 — feat(01-02): ProfileViewModel, ProfileView, EditProfileView with avatar upload

## Self-Check: PASSED
