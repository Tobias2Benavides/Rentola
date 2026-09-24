import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES } from '@/lib/categories'
import { formatPrice } from '@/lib/format'
import type { Listing, Profile } from '@/lib/types'

const STAR_PATH =
  'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string }
}) {
  const supabase = createClient()
  const q = searchParams.q?.trim() ?? ''
  const category = searchParams.category ?? ''

  let query = supabase.from('listings').select('*').eq('is_active', true).order('created_at', { ascending: false })
  if (q) query = query.ilike('title', `%${q}%`)
  if (category) query = query.eq('category', category)

  const { data: listings } = await query.returns<Listing[]>()

  const ownerIds = Array.from(new Set((listings ?? []).map((l) => l.owner_id)))
  const { data: owners } = ownerIds.length
    ? await supabase.from('profiles').select('id, average_rating').in('id', ownerIds).returns<Pick<Profile, 'id' | 'average_rating'>[]>()
    : { data: [] as Pick<Profile, 'id' | 'average_rating'>[] }
  const ratingByOwnerId = new Map((owners ?? []).map((o) => [o.id, o.average_rating]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Browse</h1>
        <p className="mt-1 text-gray-500">Find items to rent near you</p>
      </div>

      <form className="flex items-stretch overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm transition-shadow focus-within:shadow-md hover:shadow-md">
        <input
          type="text"
          name="q"
          placeholder="Search listings…"
          defaultValue={q}
          className="min-w-0 flex-1 bg-transparent px-6 py-3.5 text-sm text-gray-900 placeholder-gray-400 outline-none"
        />
        <div className="my-2 w-px shrink-0 bg-gray-200" />
        <select
          name="category"
          defaultValue={category}
          className="w-36 shrink-0 truncate bg-transparent px-4 py-3.5 text-sm text-gray-700 outline-none sm:w-52"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="m-1.5 shrink-0 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          Search
        </button>
      </form>

      {!listings || listings.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-24">
          <div className="text-center">
            <p className="font-semibold text-gray-700">No listings found</p>
            <p className="mt-1 text-sm text-gray-400">Try a different search, or be the first to list something.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const thumbUrl = listing.photos[0]
              ? supabase.storage.from('listing-photos').getPublicUrl(listing.photos[0]).data.publicUrl
              : null
            const rating = ratingByOwnerId.get(listing.owner_id) ?? 0

            return (
              <Link key={listing.id} href={`/browse/${listing.id}`} className="group block">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                  {thumbUrl && (
                    <Image
                      src={thumbUrl}
                      alt={listing.title}
                      fill
                      className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <p className="truncate font-semibold text-gray-900">{listing.title}</p>
                  {rating > 0 && (
                    <span className="flex shrink-0 items-center gap-1 text-sm text-gray-900">
                      <svg className="h-3.5 w-3.5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d={STAR_PATH} />
                      </svg>
                      {rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-500">{listing.city}</p>
                <p className="mt-1.5 font-semibold text-gray-900">
                  {formatPrice(listing.price_per_day)}
                  <span className="font-normal text-gray-400"> /day</span>
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
