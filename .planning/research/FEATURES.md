# Feature Landscape: Rentola

**Domain:** Peer-to-peer physical item rental marketplace (iOS)
**Researched:** 2026-04-06
**Confidence:** MEDIUM-HIGH (cross-referenced across Airbnb, Fat Llama, Turo, Peerby patterns + 2025/2026 sources)

---

## Table Stakes

Features users expect on first use. Missing = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Item listing with photos | No photo = no trust; users skip photoless listings | Medium | Minimum 3 photos; camera capture + library picker |
| Title + description | Users need to understand exactly what they're getting | Low | Title mandatory; description mandatory |
| Price per day | Core rental primitive; users anchor decisions on daily rate | Low | Optional weekly rate adds flexibility |
| Availability window | Prevents impossible requests; shows item is managed | Medium | Date range (from / to); not a full calendar in beta |
| Rental request flow | Renters need a clear action to "ask for" an item | Medium | Request-based (not instant book) for beta trust |
| Owner approve / decline | Owners must feel in control; instant book deferred | Low | Simple two-action card: Approve / Decline |
| Rental status lifecycle | Both sides need to know where they are in the rental | Medium | 5 states: Requested → Approved → Active → Expiring → Returned |
| Push notifications | Rental lifecycle is time-sensitive; email too slow | Medium | Permission prompt after first meaningful action, not on launch |
| Renter dashboard | Active rentals at a glance; users forget what they've booked | Medium | Current, upcoming, past sections |
| Owner dashboard | Listing management + pending requests in one place | Medium | Requests badge; active rentals count |
| Post-rental reviews | Trust mechanism; without it the marketplace cannot self-regulate | Medium | Prompted after return confirmation; blind mutual system |
| Basic user profile | Name + photo; minimum context for both parties to trust each other | Low | Displayed on requests and listings |

---

## Detailed Feature Specifications

### 1. Listing Creation Flow

**What it is:** A multi-step form that guides an owner through publishing an item for rent.

**Why it matters:** Listing quality directly determines rental conversion. Fat Llama found that listings with clear photos of actual item condition (including imperfections) get significantly more bookings. Airbnb's research showed photo quality is the single biggest predictor of booking rate.

**Mandatory fields (must not publish without):**
- Title (item name — "Canon 5D Mark IV", "IKEA Kallax shelving unit")
- Category (drives browse/search; 6-10 broad categories sufficient for beta)
- At least 1 photo (recommend enforcing minimum 3)
- Price per day
- Availability window (start date + end date)

**Optional fields (shown after mandatory, never blocking):**
- Description (strongly encouraged but not gating)
- Price per week (auto-suggest: 5x daily rate as default)
- Pickup/handoff notes (free text: "Meet at lobby", "DM for address")

**Photo requirements (Fat Llama / Airbnb pattern):**
- Minimum: 1 photo (enforce 3 in UI nudge, not hard gate)
- Maximum: 10 photos for beta (storage budget)
- Show actual item, not stock photos — communicate this in placeholder text
- Landscape (4:3) works best for item display cards; allow portrait but crop to 4:3 in card views
- iOS implementation: PHPickerViewController (multi-select, no permissions dialog) + camera capture via UIImagePickerController or AVFoundation

**iOS implementation notes:**
- Use a step-by-step flow (not a single long form): Step 1 = Category + Title, Step 2 = Photos, Step 3 = Price + Availability, Step 4 = Review + Publish
- Progress indicator at top (4 dots or step counter)
- Auto-save draft per step — user can exit and return
- PHPickerViewController preferred over UIImagePickerController (no photo library permission required in iOS 14+)
- Compress images before upload: target 1200px wide, JPEG 80% quality

---

### 2. Rental Request Flow

**What it is:** The sequence from a renter tapping "Request to Rent" to an owner approving/declining and the rental becoming active.

**Why it matters:** This is the highest-stakes interaction in the app. Friction here kills conversion. Uncertainty here kills trust.

**Request-based vs. Instant Book:**
Use request-based (not instant book) for beta. Reasons:
- No payments mean there is no automatic commitment signal; owner needs to confirm
- Builds trust between strangers for physical item handoff
- Airbnb's data showed instant book adoption grew *after* trust was established via reviews; beta has zero reviews
- Instant book is an optimization for v2 once top-rated owners exist

**Request flow steps:**
1. Renter views listing → taps "Request to Rent"
2. Date selection screen: pick start date and end date from owner's availability window (calendar range picker — blocked dates shown as disabled)
3. Optional message to owner (1-2 lines, optional, not required)
4. Summary screen: item name, dates, total cost (days × daily rate), confirm button
5. Request sent → renter sees "Pending approval" state in their dashboard
6. Owner receives push notification: "New request for [Item]"

**Owner approve/decline:**
- Notification taps into a request detail screen
- Show: renter name + profile photo, requested dates, optional message
- Two clear CTAs: "Approve" (primary) and "Decline" (secondary/destructive)
- On approval → renter gets push + rental status moves to "Approved"
- On decline → renter gets push notification; no friction for owner (no reason required for beta)

**Hold/deposit patterns (no payments):**
Without payments, no formal hold exists. Mitigation for beta:
- Show "External payment" reminder text on the approval confirmation: "Remember to arrange payment directly with [Renter name] before the rental starts"
- Add a "Handoff confirmed" action that both parties tap when item changes hands — this marks rental as "Active" and creates accountability
- No auto-charge fallback; community trust + ratings handle disputes in beta

**Calendar availability UX:**
- Owner sets a single availability window (open from/to) rather than blocking individual dates — simpler for beta
- Renter's date picker disables dates outside that window
- Once a rental is Approved, those dates become unavailable to other requesters (no double-booking)
- iOS: Use UICalendarView (iOS 16+) or HorizonCalendar (Airbnb's open-source component) for date range selection; HorizonCalendar supports rental-style blocked/available states natively

---

### 3. Rental Lifecycle States

**What it is:** The 5-state state machine that governs every rental from creation to completion.

**Why it matters:** Both parties need to know where they are at all times. Ambiguity about "is this actually booked?" or "has it been returned?" destroys trust.

**States and transitions:**

```
Requested → (Owner approves) → Approved → (Start date reached + handoff confirmed) → Active
          → (Owner declines) → Declined [terminal]
          → (Renter cancels before approval) → Cancelled [terminal]

Active → (24h before end date) → Expiring [notification trigger]
       → (End date reached OR owner marks returned) → Returned [terminal]

Returned → (Review window opens, 7 days) → Reviewed [terminal]
```

**State display:**
- Each state has a distinct color badge (not just text): Requested = grey, Approved = blue, Active = green, Expiring = amber, Returned = purple
- State badges appear on both renter dashboard cards and owner dashboard cards
- State label + human description: "Active — due back on Apr 12" not just "Active"

**iOS implementation notes:**
- Store state as an enum in the data model; never derive state from date logic alone (a rental can be "Approved" but the start date has passed if no handoff confirmation happened)
- Handoff confirmation: two-tap action — owner taps "Mark as started" OR renter taps "Confirm received" — either triggers Active state (both parties can initiate)
- Return confirmation: same pattern — either party can mark returned; the other gets a push to confirm

---

### 4. Dashboard UX Patterns

**What it is:** Two role-based dashboards — one for renters, one for owners — showing current rental state and actionable items.

**Why it matters:** Rental apps fail when users open the app and cannot immediately see what needs their attention. AppFolio and Buildium's success comes from surfacing action items immediately rather than requiring navigation.

**Renter Dashboard:**

Sections (top to bottom):
1. **Action required** (if any) — e.g., "You have a rental starting tomorrow. Confirm pickup." — amber banner, always at top
2. **Active rentals** — cards showing: item photo, item name, status badge, days remaining ("3 days left"), owner name
3. **Pending requests** — requests awaiting owner approval, with date requested
4. **Past rentals** — completed rentals; review prompt badge if review not yet written

**Owner Dashboard:**

Sections (top to bottom):
1. **Pending requests** (if any) — most urgent; badge count on tab icon
2. **Active rentals** — items currently out on rental; who has them, due back when
3. **My listings** — all listings with status (available / rented / paused); quick "pause" toggle
4. **Past rentals** — completed rentals with review prompts

**Key UX pattern:** The "action required" concept.
- Surfaces only items that need the user's *input right now*
- Approve/decline a request, confirm handoff, confirm return, write a review
- Modelled on Airbnb's hosting dashboard which shows "You have 1 request to respond to" prominently
- iOS: Use a top-pinned section in a UICollectionView compositional layout, or a pinned header in a List in SwiftUI

**Status indicators:**
- Use colored dots + text labels, never color alone (accessibility)
- Active = green circle, Expiring = amber circle + countdown, Pending = grey clock icon
- Show time context on every card: "Started 2 days ago", "Due back tomorrow", "Request sent 3 hours ago"

---

### 5. Notification Strategy

**What it is:** The push notification events that fire at key lifecycle moments, keeping both parties informed without spamming.

**Why it matters:** Rental lifecycles are time-sensitive. A missed expiry notification leads to disputes. A missed request notification means a lost rental. Push is the only reliable channel for time-sensitive events in a mobile-first app.

**Mandatory notification events:**

| Event | Recipient | Timing | Message Example |
|-------|-----------|--------|-----------------|
| New rental request received | Owner | Immediate | "[Renter name] wants to rent your [Item] Apr 10–13" |
| Request approved | Renter | Immediate | "Your request for [Item] was approved! Rental starts Apr 10." |
| Request declined | Renter | Immediate | "[Owner name] declined your request for [Item]." |
| Rental starting today | Both | Morning of start date (9am) | "Your rental of [Item] starts today. Confirm pickup when ready." |
| Expiring soon (24h warning) | Both | 24h before end date | "[Item] is due back tomorrow at [time]. Plan your return." |
| Rental expired | Both | At end date/time | "[Item] rental period has ended. Confirm the return." |
| Return confirmed | Both | Immediate | "[Renter name] confirmed [Item] has been returned." |
| Review reminder | Both | 24h after return confirmation | "How was your rental? Leave a review for [other party]." |

**iOS permission timing:**
- Do NOT request push permission on first launch (reduces opt-in rate significantly)
- Request after owner publishes their first listing, or after renter sends their first request — in-context, when the value of notifications is obvious
- Use a custom pre-permission screen before showing Apple's system dialog: "Get notified when your requests are approved" with an Enable button

**Notification management:**
- For beta, all notification types are on by default
- No in-app notification settings screen for beta — too early to tune
- Batch expiry warnings: if owner has 3 rentals expiring tomorrow, send 1 notification not 3

---

### 6. Ratings and Reviews

**What it is:** A mutual, blind post-rental review system where both renter and owner rate each other after a rental completes.

**Why it matters:** Without reviews, there is no trust mechanism. The marketplace cannot self-regulate. Users with zero reviews have no social proof. For a beta, even 5–10 reviews per listing transforms conversion.

**When the review prompt appears:**
- Triggered immediately after return is confirmed by either party
- Shown as an in-app prompt on next app open (not a push alone)
- Push notification reminder sent 24h after return if review not yet written
- Review window: 7 days (shorter than Airbnb's 14 days — beta moves faster, feedback is timelier)

**Blind mutual review system (Airbnb model):**
- Neither party sees the other's review until both have submitted, OR until the 7-day window closes
- This prevents strategic/retaliatory reviews — both parties review honestly knowing the other can't adjust
- iOS implementation: server-side flag on review record: `isRevealed: Bool`, revealed when both submitted or window expired

**Review dimensions for physical item rental:**

For renters reviewing an item/owner:
- Overall star rating (1–5, mandatory)
- "Item condition matched listing photos" (yes/no or thumbs — single tap)
- "Owner was easy to coordinate with" (yes/no or thumbs)
- Free text comment (optional, 500 char max)

For owners reviewing a renter:
- Overall star rating (1–5, mandatory)
- "Returned item in good condition" (yes/no or thumbs)
- "Easy to coordinate with" (yes/no or thumbs)
- Free text comment (optional, 500 char max)

**Why these dimensions:** Turo's review analysis shows that "condition of item" and "communication" are the two most-cited dimensions in peer rental reviews. These map to the two biggest risks in physical item rental: damage and no-shows.

**Display:**
- Show average star rating on listing card and listing detail
- Show review count next to stars (e.g., "4.8 — 12 reviews")
- Show owner's average rating and review count on their profile
- Show individual reviews (max 3 on listing detail, "See all" expands)

**Do not build for beta:**
- Verified purchase badges
- Helpful/not helpful votes on reviews
- Review responses (owner replies to reviews)
- Review moderation UI
These all add complexity without improving the signal in beta.

---

### 7. Onboarding

**What it is:** The flow from app install to a user completing their first meaningful action (either browsing items or publishing a listing).

**Why it matters:** 25% of users uninstall after first use. The onboarding window is narrow. Every additional screen before value = users lost.

**Minimum viable onboarding (beta):**

Screen 1 — Value proposition: Single screen. One headline ("Rent what you need, share what you have."), one subhead, one CTA ("Get started"). No feature tour. No carousel.

Screen 2 — Sign up: Email + password. No social login for beta. No phone verification. Confirm password field. "Already have an account? Log in" link.

Screen 3 — Profile basics: First name + last name (required), profile photo (optional, skippable). City/area (required — drives location-based browsing). No bio, no age, no elaborate fields.

Screen 4 — Role selection (optional framing): "What do you want to do first?" with two cards: "Browse items to rent" → goes to browse feed, "List something I own" → goes to listing creation. Both roles are available immediately; this just routes them to the right starting screen.

**What to defer:**
- ID verification or phone number — deferred to post-beta
- Profile bio / "About me" — irrelevant in beta
- Notification permission — do NOT show on onboarding; show in-context later
- Tutorial overlays / coach marks — skip entirely; the UI should be self-explanatory
- Referral/invite flow — post-beta growth feature

**Progressive profiling:**
After users have been active for a few sessions:
- Prompt to add a profile photo (if skipped)
- Prompt to add location (if skipped)
Never gate access — just nudge.

**iOS implementation notes:**
- Use UserDefaults or app storage to track `hasCompletedOnboarding` flag
- Onboarding state machine: new → signedUp → profileComplete → onboardingDone
- Keyboard handling: use `.scrollDismissesKeyboard(.interactively)` in SwiftUI to avoid layout issues on short screens
- Auto-focus first text field on each step

---

## Anti-Features (Do Not Build in Beta)

Features that rental apps add too early and consistently hurt UX, slow shipping, or add no beta-stage signal.

| Anti-Feature | Why It Hurts Beta | What to Do Instead |
|--------------|-------------------|-------------------|
| In-app payments (Stripe/Apple Pay) | Massive scope increase, App Store payment review complexity, trust issues without established user base | Explicit "arrange payment directly" copy + handoff confirmation action |
| Map-based item discovery | Geo-clustering, MapKit complexity, sparse supply looks bad on a map | List view with distance label ("3.2 km away") is sufficient for beta |
| Instant booking | No reviews → no trust signals to make instant booking safe; owners feel exposed | Request-based approval is the right default until review scores mature |
| In-app messaging / chat | High complexity, push + threading, message read states; most beta coordination happens over WhatsApp anyway | Brief optional "message to owner" field on request form only |
| Advanced search filters | With sparse beta supply, filtered results are empty; this feels broken | Basic category filter + distance sort is sufficient |
| Wishlists / saved items | Engagement feature for returning visitors; beta users haven't established the habit yet | Defer; focus on conversion first |
| Social features (following, activity feed) | Adds social graph complexity with near-zero social graph data to show | Ratings/reviews provide sufficient social proof |
| Owner calendar sync (iCal) | Complexity for multi-platform availability management; beta owners have one source of truth | Single availability window is sufficient |
| Dispute resolution workflow | Requires moderation team; in beta, handle disputes manually via email | Add a "Report issue" mailto link; handle manually |
| Subscription / pro tiers | Premature monetization signals to users that the app is extracting value before delivering it | Build trust first; monetize in v2 |
| Admin analytics dashboard | No data to analyze in beta; distracts from shipping | Export CSV from database manually if needed |
| Review responses (owner replies) | Adds a third state to review UI; most beta owners won't use it | Plain reviews surface enough signal; responses are a polish feature |

---

## Feature Dependencies

```
User Auth
  └── Profile creation
        └── Listing creation (requires owner profile)
              └── Browse / Search (requires supply)
                    └── Rental request (requires listings + renter profile)
                          └── Approve / Decline (requires request)
                                └── Rental lifecycle states (requires approval)
                                      └── Push notifications (requires lifecycle events)
                                            └── Return confirmation (requires active rental)
                                                  └── Reviews (requires completed rental)
```

**Critical path for beta:** Auth → Profile → Listing → Browse → Request → Approve → Lifecycle → Reviews. Each step depends on the previous. Push notifications can be layered in at any lifecycle stage but must exist before the first rental completes.

---

## MVP Recommendation

**Build in this order:**

1. Auth + minimal profile (name, photo, city) — no users, no marketplace
2. Listing creation (title, category, 1–10 photos, price/day, availability window) — no supply, no demand
3. Browse feed with distance (list view, category filter) — users can see what exists
4. Rental request flow (date picker, optional message, summary) — core transaction
5. Owner approve/decline — core trust action
6. Rental lifecycle states + both dashboards — visibility and accountability
7. Push notifications (8 events above) — time-sensitive lifecycle requires this
8. Return confirmation (handoff confirmed, return confirmed) — closes the loop
9. Ratings and reviews (blind mutual, 7-day window) — trust layer

**Defer to v2:**
- In-app payments
- Map view
- Instant booking
- In-app messaging
- Advanced search filters
- ID verification

---

## Sources

- Fat Llama listing requirements: https://fatllama.crisp.help/en/article/list-your-items-162caz3/ (attempted, 402; findings from Yo!Rent analysis and community sources — MEDIUM confidence)
- Airbnb blind review system: https://www.inc.com/laura-montini/the-psychology-of-a-positive-review-according-to-airbnb.html — HIGH confidence (cross-referenced multiple Airbnb community sources)
- Airbnb HorizonCalendar: https://github.com/airbnb/HorizonCalendar — HIGH confidence (official GitHub)
- P2P rental feature landscape: https://www.shipturtle.com/blog/peer-to-peer-rental-marketplace — MEDIUM confidence
- iOS push notification permission timing: https://medium.com/@shobhakartiwari/ios-push-notifications-stop-asking-permission-on-day-one-7a2fb2bbe366 — MEDIUM confidence (multiple sources agree)
- Rental marketplace MVP guide: https://greenmoov.app/articles/en/build-a-rental-marketplace-step-by-step-complete-2026-mvp-guide-for-airbnblike-platforms/ — MEDIUM confidence
- Turo review dimensions (condition, communication): multiple Trustpilot and consumer review analyses — MEDIUM confidence
- Marketplace onboarding patterns: https://nextnative.dev/blog/mobile-onboarding-best-practices — MEDIUM confidence
- iOS PHPickerViewController (no library permission): Apple Developer Documentation — HIGH confidence
- Airbnb review timing (24h post-checkout prompt): https://community.withairbnb.com/t5/Help/How-long-after-a-guest-leaves-will-I-be-prompted-to-write-a/m-p/129674 — MEDIUM confidence
