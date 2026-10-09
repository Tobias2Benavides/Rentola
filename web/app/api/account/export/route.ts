import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GDPR Art. 20 data export -- everything the Privacy Policy says we
// collect about the signed-in user, as one JSON file. Uses the
// cookie-bound client (not the admin client) so every query runs
// under the user's own RLS, which is the simplest guarantee that this
// can never leak another user's data even if a query here is wrong.
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const [profile, listings, rentalsOwned, rentalsRented, reviewsGiven, reviewsReceived, reports, termsAcceptances] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('listings').select('*').eq('owner_id', user.id),
      supabase.from('rentals').select('*').eq('owner_id', user.id),
      supabase.from('rentals').select('*').eq('renter_id', user.id),
      supabase.from('reviews').select('*').eq('reviewer_id', user.id),
      supabase.from('reviews').select('*').eq('reviewee_id', user.id),
      supabase.from('reports').select('*').eq('reporter_id', user.id),
      supabase.from('terms_acceptances').select('*').eq('user_id', user.id),
    ])

  const rentalIds = [...(rentalsOwned.data ?? []), ...(rentalsRented.data ?? [])].map((r) => r.id)
  const { data: messages } = rentalIds.length
    ? await supabase.from('messages').select('*').eq('sender_id', user.id).in('rental_id', rentalIds)
    : { data: [] }

  const exportData = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile.data,
    listings: listings.data ?? [],
    rentals_as_owner: rentalsOwned.data ?? [],
    rentals_as_renter: rentalsRented.data ?? [],
    messages_sent: messages ?? [],
    reviews_given: reviewsGiven.data ?? [],
    reviews_received: reviewsReceived.data ?? [],
    reports_filed: reports.data ?? [],
    terms_acceptances: termsAcceptances.data ?? [],
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="rentify-data-${user.id}.json"`,
    },
  })
}
