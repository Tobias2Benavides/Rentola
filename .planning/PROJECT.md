# Rentola

## What This Is

Rentola is a web application for peer-to-peer rental of physical items. Anyone can list something they own and rent it out; anyone can browse nearby listings and rent what they need. The beta focuses on making the publish-and-rent flow frictionless, with a clear dashboard so renters always know what they have active.

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
- [ ] Email notifications for upcoming rental expiry and expiry events
- [ ] Renter dashboard: active rentals, upcoming returns, rental history
- [ ] Owner dashboard: listings, pending requests, active rentals
- [ ] Both parties can leave a rating/review after a rental completes

### Out of Scope

- Map-based item search — deferred to post-beta; distance list view sufficient for now
- In-app payments — payments handled outside the app for beta; Stripe planned for v2
- ID verification / KYC — deferred to post-beta; community trust via ratings only
- Mobile app (iOS/Android) — web-first for beta; native app planned post-beta

## Context

- Starting hyperlocal: one city or region first, expand later
- Payments are external for beta (bank transfer, cash) — in-app payment integration is a planned v2 feature
- Design direction: clean & minimal (Airbnb-style) — lots of white space, photography-forward, premium feel
- No existing codebase — greenfield web project
- Runs locally with `npm run dev`; will deploy to custom domain later

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Backend / Auth | Supabase (PostgreSQL + Auth + Storage) |
| Language | TypeScript |
| Deployment | Vercel (later) |

## Constraints

- **Platform**: Web (browser) — runs locally, deploys to custom domain
- **Auth**: Email + password only for beta
- **Payments**: External for beta — no payment processing in v1
- **Scope**: Beta must be shippable quickly — map, payments, advanced security are post-beta

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web-first (Next.js) | Runs on any computer without Xcode or device constraints | Decided |
| Supabase backend | PostgreSQL + auth + storage in one platform; same migration reused | Decided |
| Email/password auth only | Fastest to implement; OAuth deferred | Decided |
| External payments for beta | Avoids Stripe complexity in v1 | Decided |
| Clean & minimal design | Builds trust for marketplace; premium feel without brand assets | Decided |
| Ratings/reviews for trust | Lightweight trust mechanism; no ID verification overhead | Decided |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

---
*Last updated: 2026-04-06 — pivoted from iOS native app to web application*
