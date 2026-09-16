import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import type { Profile } from '@/lib/types'

// Starts (or resumes) Stripe Connect Express onboarding for the current
// user, so they can receive payouts as a listing owner.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single<Pick<Profile, 'stripe_account_id'>>()

  let accountId = profile?.stripe_account_id ?? null

  const stripe = getStripe()

  if (!accountId) {
    // Stripe's newer Accounts v2 API — the v1 accounts.create({type: 'express'})
    // call is rejected on platforms that activated Connect after v2 became the
    // default. "recipient" configuration matches our destination-charge model:
    // the platform is merchant of record, the connected account just receives payouts.
    const account = await stripe.v2.core.accounts.create({
      contact_email: user.email,
      dashboard: 'express',
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: { stripe_transfers: { requested: true } },
          },
        },
      },
      // Required whenever a recipient has the stripe_transfers capability:
      // the platform (us) is the merchant of record and absorbs negative
      // balances, matching how v1 Express destination charges worked.
      defaults: {
        responsibilities: {
          fees_collector: 'application_express',
          losses_collector: 'application',
        },
      },
    })
    accountId = account.id
    await admin.from('profiles').update({ stripe_account_id: accountId }).eq('id', user.id)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin

  const accountLink = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['recipient'],
        refresh_url: `${siteUrl}/profile`,
        return_url: `${siteUrl}/profile`,
      },
    },
  })

  return NextResponse.json({ url: accountLink.url })
}
