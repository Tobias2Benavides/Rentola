# Requirements: Rentola

**Defined:** 2026-04-06
**Core Value:** The renter finds what they need nearby, requests it in seconds, and always knows the status of what they're renting.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can create an account with email and password
- [ ] **AUTH-02**: User can log in with email and password
- [ ] **AUTH-03**: User can reset password via email link

### Profile

- [ ] **PROF-01**: User can set a display name and upload an avatar
- [ ] **PROF-02**: User can write a short bio visible on their profile
- [ ] **PROF-03**: User's profile displays their aggregated rating from reviews

### Listings

- [ ] **LIST-01**: User can create a listing with up to 5 photos, a title, description, and category
- [ ] **LIST-02**: User can set a price per day and price per week on a listing
- [ ] **LIST-03**: User can set availability dates on a listing
- [ ] **LIST-04**: User can edit their own listing
- [ ] **LIST-05**: User can delete their own listing

### Browse & Discovery

- [ ] **BROW-01**: User can browse available items sorted by distance from their location
- [ ] **BROW-02**: User can search items by keyword
- [ ] **BROW-03**: User can filter items by category
- [ ] **BROW-04**: User can view a full item detail page (photos, description, price, owner info)

### Rental Requests

- [ ] **REQT-01**: User (renter) can send a rental request specifying dates and an optional message
- [ ] **REQT-02**: Owner can approve or decline an incoming rental request
- [ ] **REQT-03**: Renter receives an in-app and push notification when their request is approved or declined

### Rental Lifecycle

- [ ] **LIFE-01**: Rental progresses through defined statuses: pending → approved → active → returned
- [ ] **LIFE-02**: Either party can mark a rental as returned to close it
- [ ] **LIFE-03**: User receives a push notification 24 hours before their rental end date

### Dashboards

- [ ] **DASH-01**: Renter dashboard shows active rentals and rental history
- [ ] **DASH-02**: Owner dashboard shows all listings and incoming requests with their status
- [ ] **DASH-03**: Pending action items (approvals needed, returns due) are prominently surfaced
- [ ] **DASH-04**: Upcoming return dates are clearly visible on the dashboard

### Trust & Safety

- [ ] **TRST-01**: Renter and owner can each submit a star rating after a rental is marked returned
- [ ] **TRST-02**: Users can include a written review alongside their rating
- [ ] **TRST-03**: Users can report another user for inappropriate behaviour
- [ ] **TRST-04**: Users can block another user

## v2 Requirements

### Authentication

- **AUTH-V2-01**: User stays logged in across app sessions (handled automatically by Supabase, expose explicit logout in v2 settings)
- **AUTH-V2-02**: Apple Sign In option at signup

### Requests

- **REQT-V2-01**: Renter can cancel a rental request before it is approved

### Discovery

- **BROW-V2-01**: Map view of nearby items (items plotted geographically)

### Payments

- **PAY-V2-01**: Renter pays for rental through the app (Stripe or Apple Pay)
- **PAY-V2-02**: Owner receives payout after rental completes

### Trust

- **TRST-V2-01**: ID verification before first rental

## Out of Scope

| Feature | Reason |
|---------|--------|
| Map-based item search | Deferred to post-beta; distance list view is sufficient for v1 |
| In-app payments | Payments handled outside the app for beta; Stripe/Apple Pay is v2 |
| ID verification / KYC | Deferred; community trust via ratings covers beta needs |
| In-app chat / messaging | High complexity; optional message on request form is sufficient for v1 |
| Android app | iPhone-only for beta |
| Real-time in-app chat | Disproportionate complexity; not needed for core rental flow |
| Admin dashboard | Not needed for beta; direct database access sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| PROF-01 | Phase 1 | Pending |
| PROF-02 | Phase 1 | Pending |
| PROF-03 | Phase 7 | Pending |
| LIST-01 | Phase 2 | Pending |
| LIST-02 | Phase 2 | Pending |
| LIST-03 | Phase 2 | Pending |
| LIST-04 | Phase 2 | Pending |
| LIST-05 | Phase 2 | Pending |
| BROW-01 | Phase 3 | Pending |
| BROW-02 | Phase 3 | Pending |
| BROW-03 | Phase 3 | Pending |
| BROW-04 | Phase 3 | Pending |
| REQT-01 | Phase 4 | Pending |
| REQT-02 | Phase 4 | Pending |
| REQT-03 | Phase 4 | Pending |
| LIFE-01 | Phase 5 | Pending |
| LIFE-02 | Phase 5 | Pending |
| LIFE-03 | Phase 6 | Pending |
| DASH-01 | Phase 5 | Pending |
| DASH-02 | Phase 5 | Pending |
| DASH-03 | Phase 5 | Pending |
| DASH-04 | Phase 5 | Pending |
| TRST-01 | Phase 7 | Pending |
| TRST-02 | Phase 7 | Pending |
| TRST-03 | Phase 7 | Pending |
| TRST-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-06*
*Last updated: 2026-04-06 after initial definition*
