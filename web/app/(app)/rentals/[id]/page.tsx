import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatPrice } from '@/lib/format'
import RentalActions from '@/components/RentalActions'
import Chat from '@/components/Chat'
import type { Listing, Profile, Rental, RentalStatus } from '@/lib/types'

const STATUS_STYLES: Record<RentalStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  declined: 'bg-red-100 text-red-800',
  active: 'bg-green-100 text-green-800',
  returned: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-400',
}

export default async function RentalDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rental } = await supabase
    .from('rentals')
    .select('*')
    .eq('id', params.id)
    .single<Rental>()

  if (!rental) notFound()
  if (rental.owner_id !== user!.id && rental.renter_id !== user!.id) redirect('/dashboard')

  const isOwner = rental.owner_id === user!.id
  const isRenter = rental.renter_id === user!.id

  const [{ data: listing }, { data: owner }, { data: renter }] = await Promise.all([
    supabase.from('listings').select('*').eq('id', rental.listing_id).single<Listing>(),
    supabase.from('profiles').select('*').eq('id', rental.owner_id).single<Profile>(),
    supabase.from('profiles').select('*').eq('id', rental.renter_id).single<Profile>(),
  ])

  const otherParty = isOwner ? renter : owner

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-gray-900">
        ← Back to Dashboard
      </Link>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[rental.status]}`}>
              {rental.status[0].toUpperCase() + rental.status.slice(1)}
            </span>
            {listing && (
              <h1 className="mt-2 text-xl font-bold text-gray-900">
                <Link href={`/browse/${listing.id}`} className="hover:underline">
                  {listing.title}
                </Link>
              </h1>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {formatDate(rental.start_date)} → {formatDate(rental.end_date)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {isOwner ? 'Renter' : 'Owner'}: {otherParty?.display_name ?? 'Rentify user'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">{formatPrice(rental.total_price)}</p>
            <p className="text-xs text-gray-400">
              {rental.payment_status === 'paid' ? 'Paid' : rental.payment_status === 'refunded' ? 'Refunded' : 'Unpaid'}
            </p>
          </div>
        </div>

        {rental.message && (
          <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">&ldquo;{rental.message}&rdquo;</p>
        )}

        {isOwner && !owner?.stripe_onboarding_complete && rental.status === 'pending' && (
          <p className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
            You need to{' '}
            <Link href="/profile" className="font-semibold underline">
              connect a Stripe payout account
            </Link>{' '}
            before you can approve this request.
          </p>
        )}

        <div className="mt-4">
          <RentalActions
            rentalId={rental.id}
            status={rental.status}
            paymentStatus={rental.payment_status}
            isOwner={isOwner}
            isRenter={isRenter}
          />
        </div>
      </div>

      <Chat rentalId={rental.id} currentUserId={user!.id} />
    </div>
  )
}
