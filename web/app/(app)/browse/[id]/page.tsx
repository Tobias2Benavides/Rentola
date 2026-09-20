import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import RequestRentalForm from '@/components/RequestRentalForm'
import type { Listing, Profile } from '@/lib/types'

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', params.id)
    .single<Listing>()

  if (!listing) notFound()

  const { data: owner } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', listing.owner_id)
    .single<Profile>()

  const photoUrls = listing.photos.map((path) => supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl)
  const isOwner = listing.owner_id === user!.id

  const { data: blockedDatesData } = await supabase.rpc('get_listing_blocked_dates', { p_listing_id: listing.id })
  const blockedDates = (blockedDatesData ?? []) as { start_date: string; end_date: string }[]

  return (
    <div className="space-y-6">
      <Link href="/browse" className="text-sm font-medium text-gray-500 hover:text-gray-900">
        ← Back to Browse
      </Link>

      {photoUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-2xl sm:grid-cols-4">
          {photoUrls.map((url, i) => (
            <div key={url} className={`relative aspect-square bg-gray-100 ${i === 0 ? 'col-span-2 row-span-2 sm:col-span-2 sm:row-span-2' : ''}`}>
              <Image src={url} alt="" fill className="object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="space-y-4 sm:col-span-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{listing.category}</span>
            <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
            <p className="mt-1 text-gray-500">{listing.city}</p>
          </div>

          {listing.description && <p className="whitespace-pre-line text-gray-700">{listing.description}</p>}

          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200">
              {owner?.avatar_url && (
                <Image
                  src={supabase.storage.from('avatars').getPublicUrl(owner.avatar_url).data.publicUrl}
                  alt=""
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{owner?.display_name ?? 'Rentify user'}</p>
              <p className="text-xs text-gray-400">Item owner</p>
            </div>
          </div>

          <p className="text-lg font-semibold text-gray-900">
            {formatPrice(listing.price_per_day)}
            <span className="font-normal text-gray-400"> /day</span>
            {listing.price_per_week && (
              <span className="ml-3 text-base font-normal text-gray-400">
                {formatPrice(listing.price_per_week)} /week
              </span>
            )}
          </p>
        </div>

        <div>
          {isOwner ? (
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">This is your listing.</p>
              <Link
                href={`/listings/${listing.id}/edit`}
                className="block w-full rounded-xl bg-gray-900 py-3 text-center text-sm font-semibold text-white"
              >
                Edit Listing
              </Link>
            </div>
          ) : (
            <RequestRentalForm
              listingId={listing.id}
              pricePerDay={listing.price_per_day}
              blockedDates={blockedDates}
            />
          )}
        </div>
      </div>
    </div>
  )
}
