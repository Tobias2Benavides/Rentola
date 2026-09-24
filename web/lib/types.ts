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
