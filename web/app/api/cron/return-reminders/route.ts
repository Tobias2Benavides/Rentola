import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Runs once a day (see vercel.json) to remind renters their item is due
// back tomorrow. Only Vercel's own cron scheduler should hit this —
// verified via CRON_SECRET, which Vercel sends as a Bearer token for
// scheduled invocations.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: dueTomorrow } = await admin
    .from('rentals')
    .select('id, renter_id, listing_id, end_date')
    .eq('status', 'active')
    .gte('end_date', new Date().toISOString().slice(0, 10))
    .lte('end_date', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10))

  if (!dueTomorrow || dueTomorrow.length === 0) {
    return NextResponse.json({ notified: 0 })
  }

  let notified = 0
  for (const rental of dueTomorrow) {
    // Skip if we've already sent this exact reminder (cron retries, or
    // running the job more than once for the same day).
    const { data: existing } = await admin
      .from('notifications')
      .select('id')
      .eq('type', 'return_reminder')
      .eq('link', `/rentals/${rental.id}`)
      .maybeSingle()

    if (existing) continue

    const { data: listing } = await admin.from('listings').select('title').eq('id', rental.listing_id).single()

    await admin.from('notifications').insert({
      user_id: rental.renter_id,
      type: 'return_reminder',
      title: 'Due back soon',
      body: `"${listing?.title ?? 'Your rental'}" is due back on ${rental.end_date} — don't forget to return it.`,
      link: `/rentals/${rental.id}`,
    })
    notified += 1
  }

  return NextResponse.json({ notified })
}
