import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { formatPrice } from '@/lib/format'

type AdminClient = ReturnType<typeof createAdminClient>

async function handleV1Event(event: Stripe.Event, admin: AdminClient) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const rentalId = session.metadata?.rental_id
      if (rentalId) {
        const paymentIntentId =
          typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id

        // Fetch the payment method used, so a late-return fee can be
        // charged off-session later against the same card.
        let paymentMethodId: string | null = null
        if (paymentIntentId) {
          const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId)
          paymentMethodId =
            typeof paymentIntent.payment_method === 'string'
              ? paymentIntent.payment_method
              : paymentIntent.payment_method?.id ?? null
        }

        const { data: rental } = await admin
          .from('rentals')
          .update({
            payment_status: 'paid',
            stripe_payment_intent_id: paymentIntentId,
            stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
            stripe_payment_method_id: paymentMethodId,
          })
          .eq('id', rentalId)
          .select('owner_id, renter_id, listing_id, total_price')
          .single()

        if (rental) {
          const { data: listing } = await admin.from('listings').select('title').eq('id', rental.listing_id).single()
          await admin.from('notifications').insert([
            {
              user_id: rental.owner_id,
              type: 'payment_received',
              title: 'You got paid',
              body: `You were paid ${formatPrice(rental.total_price)} for "${listing?.title ?? 'your listing'}".`,
              link: `/rentals/${rentalId}`,
            },
            {
              user_id: rental.renter_id,
              type: 'payment_confirmed',
              title: 'Payment confirmed',
              body: `Your payment for "${listing?.title ?? 'this rental'}" went through — you're all set to pick it up.`,
              link: `/rentals/${rentalId}`,
            },
          ])
        }
      }
      break
    }

    // Legacy v1 Connect accounts — kept in case any were created before the
    // Accounts v2 migration.
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
}

async function handleV2Notification(notification: { type: string; related_object?: { id?: string } }, admin: AdminClient) {
  if (!notification.type.startsWith('v2.core.account')) return
  const accountId = notification.related_object?.id
  if (!accountId) return

  const account = await getStripe().v2.core.accounts.retrieve(accountId, {
    include: ['configuration.recipient'],
  })
  const status = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status
  await admin
    .from('profiles')
    .update({ stripe_onboarding_complete: status === 'active' })
    .eq('stripe_account_id', accountId)
}

// Stripe calls this directly — no user session, so it's authenticated
// purely by the webhook signature, not by Supabase auth. Two separate
// event destinations point here: one for v1-style events
// (checkout.session.completed), one for v2 Accounts "thin" events
// (v2.core.account[...]). They use different secrets AND different SDK
// parsing methods — constructEvent() actively rejects a v2 payload rather
// than just failing signature checks, so each gets its own attempt.
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')
  const v1Secret = process.env.STRIPE_WEBHOOK_SECRET
  const v2Secret = process.env.STRIPE_WEBHOOK_SECRET_CONNECT

  if (!signature || (!v1Secret && !v2Secret)) {
    return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 400 })
  }

  const stripe = getStripe()
  const admin = createAdminClient()

  if (v1Secret) {
    try {
      const event = stripe.webhooks.constructEvent(body, signature, v1Secret)
      await handleV1Event(event, admin)
      return NextResponse.json({ received: true })
    } catch {
      // Wrong secret for this payload, or a v2 thin event — fall through.
    }
  }

  if (v2Secret) {
    try {
      const notification = stripe.parseEventNotification(body, signature, v2Secret) as unknown as {
        type: string
        related_object?: { id?: string }
      }
      await handleV2Notification(notification, admin)
      return NextResponse.json({ received: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid signature'
      return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
    }
  }

  return NextResponse.json({ error: 'No webhook secret matched this request' }, { status: 400 })
}
