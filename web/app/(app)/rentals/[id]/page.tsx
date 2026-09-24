import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatPrice } from '@/lib/format'
import RentalActions from '@/components/RentalActions'
import ReviewForm from '@/components/ReviewForm'
import Chat from '@/components/Chat'
import type { Listing, Profile, Rental, RentalStatus, Review } from '@/lib/types'

const STAR_PATH =
  'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'

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

  let myReview: Review | null = null
  if (rental.status === 'returned') {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('rental_id', rental.id)
      .eq('reviewer_id', user!.id)
      .maybeSingle<Review>()
    myReview = data
  }

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

        {rental.late_fee_amount != null && (
          <p
            className={`mt-4 rounded-xl p-3 text-sm ${
              rental.late_fee_status === 'charged'
                ? 'bg-yellow-50 text-yellow-800'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {rental.late_fee_status === 'charged' &&
              `A late-return fee of ${formatPrice(rental.late_fee_amount)} was charged for returning after the due date.`}
            {rental.late_fee_status === 'failed' &&
              `A late-return fee of ${formatPrice(rental.late_fee_amount)} was due, but the charge failed — the owner should be paid directly.`}
            {rental.late_fee_status === 'no_payment_method' &&
              `A late-return fee of ${formatPrice(rental.late_fee_amount)} is due, but no saved payment method was found — the owner should be paid directly.`}
          </p>
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

      {rental.status === 'returned' && otherParty && (
        myReview ? (
          <div className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4">
            <p className="font-semibold text-gray-900">You rated {otherParty.display_name ?? 'Rentify user'}</p>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`h-5 w-5 ${star <= myReview!.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d={STAR_PATH} />
                </svg>
              ))}
            </div>
            {myReview.comment && <p className="text-sm text-gray-600">&ldquo;{myReview.comment}&rdquo;</p>}
          </div>
        ) : (
          <ReviewForm
            rentalId={rental.id}
            revieweeId={otherParty.id}
            revieweeName={otherParty.display_name ?? 'Rentify user'}
          />
        )
      )}

      <Chat rentalId={rental.id} currentUserId={user!.id} />
    </div>
  )
}
