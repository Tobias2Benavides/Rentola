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

    // Legacy v1 Connect accounts — kept in case any were created before the
    // Accounts v2 migration below.
    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      await admin
        .from('profiles')
        .update({ stripe_onboarding_complete: Boolean(account.details_submitted && account.charges_enabled) })
        .eq('stripe_account_id', account.id)
      break
    }

    default: {
      // Accounts v2 events use a "thin" envelope (type starts with
      // "v2.core.account") — no embedded object, just a related_object.id
      // to look up. Re-fetch the account to read the current capability status.
      if (event.type.startsWith('v2.core.account')) {
        const accountId = (event as unknown as { related_object?: { id?: string } }).related_object?.id
        if (accountId) {
          const account = await getStripe().v2.core.accounts.retrieve(accountId, {
            include: ['configuration.recipient'],
          })
          const status = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status
          await admin
            .from('profiles')
            .update({ stripe_onboarding_complete: status === 'active' })
            .eq('stripe_account_id', accountId)
        }
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
