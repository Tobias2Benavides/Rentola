'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/format'
import MapCore from '@/components/map/MapCoreLoader'

const STAR_PATH =
  'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'

export interface BrowseListingDisplay {
  id: string
  title: string
  city: string
  pricePerDay: number
  thumbUrl: string | null
  rating: number
  latitude: number | null
  longitude: number | null
}

function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-24">
      <div className="text-center">
        <p className="font-semibold text-gray-700">{message}</p>
        <p className="mt-1 text-sm text-gray-400">{hint}</p>
      </div>
    </div>
  )
}

export default function BrowseMapView({ listings }: { listings: BrowseListingDisplay[] }) {
  const [view, setView] = useState<'list' | 'map'>('list')
  const located = listings.filter((l) => l.latitude != null && l.longitude != null)

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <button
          type="button"
          onClick={() => setView('list')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setView('map')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            view === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
          }`}
        >
          Map
        </button>
      </div>

      {view === 'list' ? (
        listings.length === 0 ? (
          <EmptyState message="No listings found" hint="Try a different search, or be the first to list something." />
        ) : (
          <div className="grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Link key={listing.id} href={`/browse/${listing.id}`} className="group block">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                  {listing.thumbUrl && (
                    <Image
                      src={listing.thumbUrl}
                      alt={listing.title}
                      fill
                      className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <p className="truncate font-semibold text-gray-900">{listing.title}</p>
                  {listing.rating > 0 && (
                    <span className="flex shrink-0 items-center gap-1 text-sm text-gray-900">
                      <svg className="h-3.5 w-3.5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d={STAR_PATH} />
                      </svg>
                      {listing.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-500">{listing.city}</p>
                <p className="mt-1.5 font-semibold text-gray-900">
                  {formatPrice(listing.pricePerDay)}
                  <span className="font-normal text-gray-400"> /day</span>
                </p>
              </Link>
            ))}
          </div>
        )
      ) : located.length === 0 ? (
        <EmptyState
          message="No listings have a location set yet"
          hint="Owners can add one from their listing's edit page."
        />
      ) : (
        <div className="space-y-2">
          <MapCore
            markers={located.map((l) => ({
              id: l.id,
              lat: l.latitude as number,
              lng: l.longitude as number,
              popupLabel: `${l.title} — ${formatPrice(l.pricePerDay)}/day`,
              href: `/browse/${l.id}`,
            }))}
            fitToMarkers
            heightClassName="h-[28rem]"
          />
          <p className="text-xs text-gray-400">
            {located.length} of {listings.length} listings have a location set
          </p>
        </div>
      )}
    </div>
  )
}
