import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatPrice, isDueTomorrow } from '@/lib/format'
import type { Listing, Profile, Rental, RentalStatus } from '@/lib/types'

const STATUS_STYLES: Record<RentalStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  declined: 'bg-red-100 text-red-800',
  active: 'bg-green-100 text-green-800',
  returned: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-gray-100 text-gray-400',
}

function needsAction(rental: Rental, role: 'renter' | 'owner'): boolean {
  if (role === 'owner' && rental.status === 'pending') return true
  if (role === 'renter' && rental.status === 'approved' && rental.payment_status === 'unpaid') return true
  if (rental.status === 'approved' && rental.payment_status === 'paid') return true
  if (rental.status === 'active') return true
  return false
}

function DueTomorrowBanner({
  rentals,
  listingsById,
  counterpartyNameById,
  userId,
}: {
  rentals: Rental[]
  listingsById: Map<string, Listing>
  counterpartyNameById: Map<string, string>
  userId: string
}) {
  if (rentals.length === 0) return null

  return (
    <div className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">Due back tomorrow</p>
      <ul className="space-y-1">
        {rentals.map((rental) => {
          const listing = listingsById.get(rental.listing_id)
          const title = listing?.title ?? 'this item'
          const isRenter = rental.renter_id === userId
          const counterparty = counterpartyNameById.get(isRenter ? rental.owner_id : rental.renter_id) ?? 'them'
          return (
            <li key={rental.id}>
              <Link
                href={`/rentals/${rental.id}`}
                className="text-sm text-amber-900 underline decoration-amber-400 underline-offset-2 hover:text-amber-950"
              >
                {isRenter
                  ? `Return "${title}" to ${counterparty} by ${formatDate(rental.end_date)}`
                  : `${counterparty} needs to return "${title}" by ${formatDate(rental.end_date)}`}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function RentalGroup({
  title,
  emptyText,
  rentals,
  listingsById,
  role,
}: {
  title: string
  emptyText: string
  rentals: Rental[]
  listingsById: Map<string, Listing>
  role: 'renter' | 'owner'
}) {
  const sorted = [...rentals].sort((a, b) => Number(needsAction(b, role)) - Number(needsAction(a, role)))

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-400">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((rental) => {
            const listing = listingsById.get(rental.listing_id)
            return (
              <Link
                key={rental.id}
                href={`/rentals/${rental.id}`}
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3.5 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{listing?.title ?? 'Listing'}</p>
                    {needsAction(rental, role) && (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Action required" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatDate(rental.start_date)} → {formatDate(rental.end_date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">{formatPrice(rental.total_price)}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[rental.status]}`}>
                    {rental.status}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: renting }, { data: lending }] = await Promise.all([
    supabase.from('rentals').select('*').eq('renter_id', user!.id).order('created_at', { ascending: false }).returns<Rental[]>(),
    supabase.from('rentals').select('*').eq('owner_id', user!.id).order('created_at', { ascending: false }).returns<Rental[]>(),
  ])

  const listingIds = Array.from(new Set([...(renting ?? []), ...(lending ?? [])].map((r) => r.listing_id)))
  const { data: listings } = listingIds.length
    ? await supabase.from('listings').select('*').in('id', listingIds).returns<Listing[]>()
    : { data: [] as Listing[] }
  const listingsById = new Map((listings ?? []).map((l) => [l.id, l]))

  const dueTomorrow = [...(renting ?? []), ...(lending ?? [])].filter(
    (r) => r.status === 'active' && isDueTomorrow(r.end_date)
  )
  const counterpartyIds = Array.from(
    new Set(dueTomorrow.map((r) => (r.renter_id === user!.id ? r.owner_id : r.renter_id)))
  )
  const { data: counterparties } = counterpartyIds.length
    ? await supabase.from('profiles').select('id, display_name').in('id', counterpartyIds).returns<Pick<Profile, 'id' | 'display_name'>[]>()
    : { data: [] as Pick<Profile, 'id' | 'display_name'>[] }
  const counterpartyNameById = new Map((counterparties ?? []).map((p) => [p.id, p.display_name ?? 'them']))

  const activeRenting = (renting ?? []).filter((r) => r.status === 'approved' || r.status === 'active').length
  const activeLending = (lending ?? []).filter((r) => r.status === 'approved' || r.status === 'active').length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Track your active rentals</p>
      </div>

      <DueTomorrowBanner
        rentals={dueTomorrow}
        listingsById={listingsById}
        counterpartyNameById={counterpartyNameById}
        userId={user!.id}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <span className="font-semibold text-gray-900">Renting</span>
          <p className="mt-1 text-2xl font-bold text-gray-900">{activeRenting}</p>
          <p className="text-sm text-gray-400">Active rentals</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <span className="font-semibold text-gray-900">Lending</span>
          <p className="mt-1 text-2xl font-bold text-gray-900">{activeLending}</p>
          <p className="text-sm text-gray-400">Active listings out</p>
        </div>
      </div>

      <RentalGroup
        title="Renting"
        emptyText="You haven't requested anything yet. Go browse and find something to rent."
        rentals={renting ?? []}
        listingsById={listingsById}
        role="renter"
      />

      <RentalGroup
        title="Lending"
        emptyText="No rental requests on your listings yet."
        rentals={lending ?? []}
        listingsById={listingsById}
        role="owner"
      />
    </div>
  )
}
