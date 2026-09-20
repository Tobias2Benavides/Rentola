import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { CATEGORIES } from '@/lib/categories'
import { formatPrice } from '@/lib/format'
import type { Listing } from '@/lib/types'

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Browse</h1>
        <p className="mt-1 text-gray-500">Find items to rent near you</p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          name="q"
          placeholder="Search listings…"
          defaultValue={q}
          className="w-full rounded-xl bg-gray-100 px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-600 sm:flex-1"
        />
        <select
          name="category"
          defaultValue={category}
          className="w-full rounded-xl bg-gray-100 px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-600 sm:w-56"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-6 py-3 text-sm font-semibold text-white">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const thumbUrl = listing.photos[0]
              ? supabase.storage.from('listing-photos').getPublicUrl(listing.photos[0]).data.publicUrl
              : null

            return (
              <Link
                key={listing.id}
                href={`/browse/${listing.id}`}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square bg-gray-100">
                  {thumbUrl && <Image src={thumbUrl} alt={listing.title} fill className="object-cover" />}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900">{listing.title}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{listing.city}</p>
                  <p className="mt-2 font-semibold text-gray-900">
                    {formatPrice(listing.price_per_day)}
                    <span className="font-normal text-gray-400"> /day</span>
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
