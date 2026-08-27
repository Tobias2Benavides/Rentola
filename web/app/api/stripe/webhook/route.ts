import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

// Stripe calls this directly — no user session, so it's authenticated
// purely by the webhook signature, not by Supabase auth. Register this
// endpoint's URL + signing secret in the Stripe dashboard (or via
// `stripe listen` locally).
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
  }

  const admin = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const rentalId = session.metadata?.rental_id
      if (rentalId) {
        await admin
          .from('rentals')
          .update({
            payment_status: 'paid',
            stripe_payment_intent_id:
              typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
          })
          .eq('id', rentalId)
      }
      break
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      await admin
        .from('profiles')
        .update({ stripe_onboarding_complete: Boolean(account.details_submitted && account.charges_enabled) })
        .eq('stripe_account_id', account.id)
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
