# Rentola

## What This Is

Rentola is an iPhone app for peer-to-peer rental of physical items. Anyone can list something they own and rent it out; anyone can browse nearby listings and rent what they need. The beta focuses on making the publish-and-rent flow frictionless, with a clear dashboard so renters always know what they have active.

## Core Value

The renter finds what they need nearby, requests it in seconds, and always knows the status of what they're renting.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can sign up and log in with email and password
- [ ] User can publish an item listing (photos, title, description, price per day/week, availability period)
- [ ] User can browse available items near them
- [ ] User can send a rental request to an item owner
- [ ] Owner can approve or decline rental requests
- [ ] Full rental lifecycle: request → approved → active → expiring → returned
- [ ] Push notifications for upcoming rental expiry and expiry events
- [ ] Renter dashboard: active rentals, upcoming returns, rental history
- [ ] Owner dashboard: listings, pending requests, active rentals
- [ ] Both parties can leave a rating/review after a rental completes

### Out of Scope

- Map-based item search — deferred to post-beta; distance list view sufficient for now
- In-app payments — payments handled outside the app for beta; Stripe/Apple Pay planned for v2
- ID verification / KYC — deferred to post-beta; community trust via ratings only
- Location browsing on map — deferred; focus on core rental flow first
- Android app — iPhone only for beta

## Context

- Starting hyperlocal: one city or region first, expand later
- Payments are external for beta (bank transfer, cash) — in-app payment integration is a planned v2 feature; future monetization model should create incentives to transact through the platform
- Design direction: clean & minimal (Airbnb-style) — lots of white space, photography-forward, premium feel; no brand assets exist yet so design decisions will be made during development
- No existing codebase — greenfield iOS project

## Constraints

- **Platform**: iOS (iPhone) only — SwiftUI native app
- **Auth**: Email + password only for beta — Apple Sign In deferred
- **Payments**: External for beta — no payment processing in v1
- **Scope**: Beta must be shippable quickly — map, payments, advanced security are post-beta

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| iOS-first | Target market is iPhone users; simplifies beta scope | — Pending |
| Email/password auth only | Fastest to implement; Apple Sign In deferred | — Pending |
| External payments for beta | Avoids Stripe/App Store payment complexity in v1 | — Pending |
| Clean & minimal design | Builds trust for marketplace; premium feel without brand assets | — Pending |
| Ratings/reviews for trust | Lightweight trust mechanism; no ID verification overhead | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-06 after initialization*
