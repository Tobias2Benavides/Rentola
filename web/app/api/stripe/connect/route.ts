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
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
    })
    accountId = account.id
    await admin.from('profiles').update({ stripe_account_id: accountId }).eq('id', user.id)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${siteUrl}/profile`,
    return_url: `${siteUrl}/profile`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
