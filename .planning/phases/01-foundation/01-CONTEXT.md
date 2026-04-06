# Phase 1: Foundation - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Xcode project setup + SwiftUI MVVM + Coordinator skeleton (4-tab app shell) + Supabase client + email/password auth flows (sign up, sign in, password reset) + email verification gate + user profile (display name, bio, avatar). This is the skeleton every subsequent phase drops into. No rental logic, no listings, no browse — auth and shell only.

</domain>

<decisions>
## Implementation Decisions

### Auth Flow UX
- **D-01:** App opens to a branded welcome/landing screen with "Sign in" and "Create account" buttons — Airbnb-style first impression, not straight to a form.
- **D-02:** Email verification is required before users can enter the app. After signup, show a "Check your email" screen; app only unlocks once the verification link is clicked and the session is confirmed.
- **D-03:** Auth forms are full-screen (not modal sheets) — they are the primary entry point.

### App Shell
- **D-04:** 4-tab navigation. Tab labels and icons are Claude's discretion (clean, minimal icons — SF Symbols preferred). Suggested: Browse, Renting, Listing, Profile.
- **D-05:** Each tab has its own Coordinator with placeholder screens in Phase 1 — real content drops in during Phases 2–4.

### Onboarding After Signup
- **D-06:** After email verification, users land directly in the app. Profile setup (display name, bio, avatar) is accessible via the Profile tab but is not a mandatory interstitial step. A subtle prompt on the profile screen encourages completion.

### Empty States
- **D-07:** Claude's discretion — use whatever pattern best fits the clean minimal aesthetic. Consistency between renter and owner dashboards matters more than a specific approach.

### Claude's Discretion
- Exact tab icons and colours (use clean SF Symbols, match minimal Airbnb-style aesthetic)
- Loading skeleton vs spinner for auth state check on launch
- Exact error message copy for auth failures (wrong password, unverified email, network error)
- Empty state design for dashboards (illustration vs minimal text — keep consistent with overall aesthetic)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Vision, design direction (clean & minimal, Airbnb-style), core value statement
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-03, PROF-01 through PROF-03 (all Phase 1 requirements)
- `.planning/ROADMAP.md` — Phase 1 plan descriptions (Plan 1.1 and Plan 1.2 detail)

### Research
- `.planning/research/STACK.md` — SwiftUI iOS 17, Supabase Auth, PKCE flow, session persistence
- `.planning/research/ARCHITECTURE.md` — MVVM + Coordinator pattern, AppCoordinator, MainTabCoordinator, per-tab coordinators, NavigationPath
- `.planning/research/PITFALLS.md` — RLS must be enabled from day one (security pitfall), Firebase rules equivalent warning applies to Supabase RLS

No external specs or ADRs beyond the above — requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No existing code.

### Established Patterns
- None yet — Phase 1 establishes patterns for all subsequent phases. Key patterns to establish:
  - MVVM + Coordinator (AppCoordinator → MainTabCoordinator → per-tab coordinators)
  - `@Observable` ViewModels (iOS 17+)
  - Supabase client singleton initialisation
  - RLS policies on all tables from day one

### Integration Points
- Phase 2 (Listings) drops into the Browse and Profile tabs established here
- Phase 3 (Browse) populates the Browse tab placeholder
- Phase 4 (Requests + Lifecycle) populates the Renting and Listing tabs
- All push notification deep links depend on the Coordinator pattern established here

</code_context>

<specifics>
## Specific Ideas

- Clean & minimal aesthetic — Airbnb-style. Lots of white space, photography-forward in later phases.
- No brand assets exist yet — design decisions (color, typography) are Claude's discretion. Lean neutral/minimal.
- Welcome screen should make a good first impression — it's the first thing beta users see.

</specifics>

<deferred>
## Deferred Ideas

- Apple Sign In — explicitly deferred to post-beta (see REQUIREMENTS.md v2)
- Mandatory onboarding interstitial — user preferred direct app entry after verification

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-06*
