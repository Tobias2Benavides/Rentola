import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatPrice } from '@/lib/format'
import { PLATFORM_FEE_BPS } from '@/lib/stripe'
import type { Listing, Rental } from '@/lib/types'

export default async function EarningsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rentals } = await supabase
    .from('rentals')
    .select('*')
    .eq('owner_id', user!.id)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })
    .returns<Rental[]>()

  const paidRentals = rentals ?? []
  const listingIds = Array.from(new Set(paidRentals.map((r) => r.listing_id)))
  const { data: listings } = listingIds.length
    ? await supabase.from('listings').select('*').in('id', listingIds).returns<Listing[]>()
    : { data: [] as Listing[] }
  const listingsById = new Map((listings ?? []).map((l) => [l.id, l]))

  const rentalIncome = paidRentals.reduce((sum, r) => sum + r.total_price, 0)
  const lateFeeIncome = paidRentals
    .filter((r) => r.late_fee_status === 'charged')
    .reduce((sum, r) => sum + (r.late_fee_amount ?? 0), 0)
  const grossEarnings = rentalIncome + lateFeeIncome
  const platformFee = (grossEarnings * PLATFORM_FEE_BPS) / 10000
  const netEarnings = grossEarnings - platformFee

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <p className="mt-1 text-gray-500">What you&apos;ve made lending your items out</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
          <p className="text-sm text-gray-500">Net earnings</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{formatPrice(netEarnings)}</p>
          <p className="mt-1 text-xs text-gray-400">After the platform fee — this is what lands in your account</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
          <p className="text-sm text-gray-500">Gross collected</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatPrice(grossEarnings)}</p>
          <p className="mt-1 text-xs text-gray-400">
            {formatPrice(rentalIncome)} rentals + {formatPrice(lateFeeIncome)} late fees
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
          <p className="text-sm text-gray-500">Platform fee</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatPrice(platformFee)}</p>
          <p className="mt-1 text-xs text-gray-400">{PLATFORM_FEE_BPS / 100}% of what you collect</p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-gray-900">Transactions</h2>
        {paidRentals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-400">
            No paid rentals yet — once someone pays for one of your listings, it&apos;ll show up here.
          </p>
        ) : (
          <div className="space-y-2">
            {paidRentals.map((rental) => {
              const listing = listingsById.get(rental.listing_id)
              const total = rental.total_price + (rental.late_fee_status === 'charged' ? rental.late_fee_amount ?? 0 : 0)
              return (
                <Link
                  key={rental.id}
                  href={`/rentals/${rental.id}`}
                  className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-gray-900/5 transition-shadow hover:shadow-md"
                >
                  <div>
                    <p className="font-medium text-gray-900">{listing?.title ?? 'Listing'}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(rental.start_date)} → {formatDate(rental.end_date)}
                      {rental.late_fee_status === 'charged' && ' · includes late fee'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">+{formatPrice(total)}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
