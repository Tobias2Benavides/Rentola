import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, platformFeeFor } from '@/lib/stripe'
import type { Listing, Profile, Rental } from '@/lib/types'

// Creates a Stripe Checkout Session for an approved, unpaid rental.
// The renter pays; funds go to the owner's connected account via a
// destination charge, minus the platform fee.
export async function POST(request: NextRequest) {
  const { rentalId } = await request.json()
  if (!rentalId) {
    return NextResponse.json({ error: 'rentalId is required' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data: rental } = await supabase
    .from('rentals')
    .select('*')
    .eq('id', rentalId)
    .single<Rental>()

  if (!rental) {
    return NextResponse.json({ error: 'Rental not found' }, { status: 404 })
  }
  if (rental.renter_id !== user.id) {
    return NextResponse.json({ error: 'Only the renter can pay for this rental' }, { status: 403 })
  }
  if (rental.status !== 'approved') {
    return NextResponse.json({ error: 'Rental is not approved yet' }, { status: 400 })
  }
  if (rental.payment_status !== 'unpaid') {
    return NextResponse.json({ error: 'Rental has already been paid' }, { status: 400 })
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('title')
    .eq('id', rental.listing_id)
    .single<Pick<Listing, 'title'>>()

  const admin = createAdminClient()
  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('stripe_account_id, stripe_onboarding_complete')
    .eq('id', rental.owner_id)
    .single<Pick<Profile, 'stripe_account_id' | 'stripe_onboarding_complete'>>()

  if (!ownerProfile?.stripe_account_id || !ownerProfile.stripe_onboarding_complete) {
    return NextResponse.json(
      { error: "The item owner hasn't finished connecting payouts yet" },
      { status: 400 }
    )
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin
  const amountCents = Math.round(rental.total_price * 100)
  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    // Saves the card to a Customer so a late-return fee can be charged
    // off-session later, without the renter re-entering payment details.
    customer_creation: 'always',
    payment_intent_data: {
      application_fee_amount: platformFeeFor(amountCents),
      transfer_data: { destination: ownerProfile.stripe_account_id },
      setup_future_usage: 'off_session',
    },
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: { name: listing?.title ?? 'Rentify rental' },
        },
        quantity: 1,
      },
    ],
    metadata: { rental_id: rental.id },
    success_url: `${siteUrl}/rentals/${rental.id}?paid=1`,
    cancel_url: `${siteUrl}/rentals/${rental.id}`,
  })

  await admin
    .from('rentals')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', rental.id)

  return NextResponse.json({ url: session.url })
}
