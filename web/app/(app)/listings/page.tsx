import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/format'
import type { Listing } from '@/lib/types'

export default async function MyListingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: listings } = await supabase
    .from('listings')
    .select('*')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false })
    .returns<Listing[]>()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
          <p className="mt-1 text-gray-500">Items you&apos;re renting out</p>
        </div>
        <Link href="/listings/new" className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
          + List an item
        </Link>
      </div>

      {!listings || listings.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-24">
          <div className="text-center">
            <p className="font-semibold text-gray-700">No listings yet</p>
            <p className="mt-1 text-sm text-gray-400">Publish your first item to start renting it out.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {listings.map((listing) => {
            const thumbUrl = listing.photos[0]
              ? supabase.storage.from('listing-photos').getPublicUrl(listing.photos[0]).data.publicUrl
              : null

            return (
              <div key={listing.id} className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {thumbUrl && <Image src={thumbUrl} alt="" fill className="object-cover" />}
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{listing.title}</p>
                    <p className="text-sm text-gray-500">
                      {formatPrice(listing.price_per_day)}/day · {listing.city}
                    </p>
                    {!listing.is_active && (
                      <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 text-sm font-medium">
                    <Link href={`/browse/${listing.id}`} className="text-gray-500 hover:text-gray-900">
                      View
                    </Link>
                    <Link href={`/listings/${listing.id}/edit`} className="text-gray-900 underline underline-offset-4">
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
