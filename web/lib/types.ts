export type RentalStatus = 'pending' | 'approved' | 'declined' | 'active' | 'returned' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded'

export interface Profile {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  average_rating: number
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  payment_instructions: string | null
  is_admin: boolean
  suspended_at: string | null
  suspension_reason: string | null
}

export interface Listing {
  id: string
  owner_id: string
  title: string
  description: string | null
  category: string
  price_per_day: number
  price_per_week: number | null
  city: string
  photos: string[]
  is_active: boolean
  needs_review: boolean
  flag_reason: string | null
  created_at: string
}

export interface ItemRequest {
  id: string
  requester_id: string
  title: string
  description: string | null
  category: string
  city: string
  created_at: string
}

export interface Rental {
  id: string
  listing_id: string
  owner_id: string
  renter_id: string
  status: RentalStatus
  start_date: string
  end_date: string
  message: string | null
  total_price: number
  payment_status: PaymentStatus
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  stripe_customer_id: string | null
  stripe_payment_method_id: string | null
  late_fee_amount: number | null
  late_fee_status: 'charged' | 'failed' | 'no_payment_method' | null
  late_fee_payment_intent_id: string | null
  agreement_accepted_at: string | null
  created_at: string
}

export type HandoverStage = 'pickup' | 'return'

export interface HandoverPhoto {
  id: string
  rental_id: string
  uploaded_by: string
  stage: HandoverStage
  photo_path: string
  condition_ok: boolean
  issue_description: string | null
  created_at: string
}

export interface Message {
  id: string
  rental_id: string
  sender_id: string
  body: string
  created_at: string
}

export interface Review {
  id: string
  rental_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
}

export type ReportReason =
  | 'illegal_prohibited_item'
  | 'stolen_item'
  | 'scam_fraud'
  | 'harassment'
  | 'fake_listing'
  | 'safety_issue'
  | 'ip_infringement'
  | 'other'

export type ReportTargetType = 'listing' | 'user' | 'message' | 'booking'
export type ReportStatus = 'open' | 'reviewing' | 'actioned' | 'dismissed'

export interface Report {
  id: string
  reporter_id: string | null
  reporter_email: string | null
  target_type: ReportTargetType
  target_id: string
  reason: ReportReason
  details: string | null
  evidence_paths: string[]
  status: ReportStatus
  created_at: string
  resolved_at: string | null
  resolution_note: string | null
}

export type ModerationActionType =
  | 'listing_removed'
  | 'listing_restored'
  | 'user_suspended'
  | 'user_unsuspended'
  | 'report_dismissed'
  | 'report_actioned'
  | 'note_added'

export interface ModerationAction {
  id: string
  target_type: ReportTargetType
  target_id: string
  action: ModerationActionType
  reason: string
  based_on_report_id: string | null
  created_by: string
  created_at: string
}

export interface Block {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}

export interface TermsAcceptance {
  id: string
  user_id: string
  document: 'terms' | 'rental_agreement' | 'privacy'
  version: number
  accepted_at: string
  user_agent: string | null
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}
