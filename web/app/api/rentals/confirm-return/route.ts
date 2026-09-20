import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, platformFeeFor } from '@/lib/stripe'
import { formatPrice } from '@/lib/format'
import type { Listing, Profile, Rental } from '@/lib/types'

// Confirms a rental's return (via the same RPC the client used to call
// directly) and, if it's late, charges the renter's saved card for the
// extra days at the listing's normal daily rate.
export async function POST(request: NextRequest) {
  const { rentalId } = await request.json()
  if (!rentalId) {
    return NextResponse.json({ error: 'rentalId is required' }, { status: 400 })
  }

  // Runs as the calling user so the RPC's own auth.uid() participant
  // check still applies — this route only adds the late-fee side effect,
  // it doesn't relax who's allowed to confirm a return.
  const supabase = createClient()
  const { data, error: rpcError } = await supabase.rpc('confirm_rental_return', { p_rental_id: rentalId })
  const rental = data as Rental | null

  if (rpcError || !rental) {
    return NextResponse.json({ error: rpcError?.message ?? 'Could not confirm return' }, { status: 400 })
  }

  const endDate = new Date(rental.end_date + 'T00:00:00Z')
  const now = new Date()
  const lateDays = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))

  if (lateDays > 0) {
    const admin = createAdminClient()
    const [{ data: listing }, { data: ownerProfile }] = await Promise.all([
      admin.from('listings').select('price_per_day').eq('id', rental.listing_id).single<Pick<Listing, 'price_per_day'>>(),
      admin
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', rental.owner_id)
        .single<Pick<Profile, 'stripe_account_id'>>(),
    ])

    const lateFeeAmount = listing ? lateDays * listing.price_per_day : null

    if (lateFeeAmount && rental.stripe_customer_id && rental.stripe_payment_method_id && ownerProfile?.stripe_account_id) {
      const amountCents = Math.round(lateFeeAmount * 100)
      try {
        const paymentIntent = await getStripe().paymentIntents.create({
          amount: amountCents,
          currency: 'usd',
          customer: rental.stripe_customer_id,
          payment_method: rental.stripe_payment_method_id,
          off_session: true,
          confirm: true,
          application_fee_amount: platformFeeFor(amountCents),
          transfer_data: { destination: ownerProfile.stripe_account_id },
          metadata: { rental_id: rental.id, reason: 'late_return_fee' },
        })
        await admin
          .from('rentals')
          .update({
            late_fee_amount: lateFeeAmount,
            late_fee_status: 'charged',
            late_fee_payment_intent_id: paymentIntent.id,
          })
          .eq('id', rental.id)

        await admin.from('notifications').insert([
          {
            user_id: rental.renter_id,
            type: 'late_fee_charged',
            title: 'Late-return fee charged',
            body: `You were charged ${formatPrice(lateFeeAmount)} for returning ${lateDays} day${lateDays === 1 ? '' : 's'} late.`,
            link: `/rentals/${rental.id}`,
          },
          {
            user_id: rental.owner_id,
            type: 'late_fee_received',
            title: 'You received a late-return fee',
            body: `An extra ${formatPrice(lateFeeAmount)} was charged and sent your way for a late return.`,
            link: `/rentals/${rental.id}`,
          },
        ])
      } catch {
        // Off-session charge failed (card declined, requires authentication,
        // etc.) — record it as failed rather than silently losing the fee.
        await admin
          .from('rentals')
          .update({ late_fee_amount: lateFeeAmount, late_fee_status: 'failed' })
          .eq('id', rental.id)
      }
    } else if (lateFeeAmount) {
      await admin
        .from('rentals')
        .update({ late_fee_amount: lateFeeAmount, late_fee_status: 'no_payment_method' })
        .eq('id', rental.id)
    }
  }

  return NextResponse.json({ received: true })
}
