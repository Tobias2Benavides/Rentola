import { createClient } from '@/lib/supabase/server'
import BrowseSearchForm from '@/components/BrowseSearchForm'
import BrowseMapView, { type BrowseListingDisplay } from '@/components/BrowseMapView'
import type { Listing, Profile } from '@/lib/types'

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

  // Build one plain, serializable array to hand to the client component --
  // a JS Map (ratingByOwnerId above) or the raw owners/Profile rows aren't
  // needed on the client and a Map instance isn't serializable as a prop.
  const displayListings: BrowseListingDisplay[] = (listings ?? []).map((listing) => ({
    id: listing.id,
    title: listing.title,
    city: listing.city,
    pricePerDay: listing.price_per_day,
    thumbUrl: listing.photos[0]
      ? supabase.storage.from('listing-photos').getPublicUrl(listing.photos[0]).data.publicUrl
      : null,
    rating: ratingByOwnerId.get(listing.owner_id) ?? 0,
    latitude: listing.latitude,
    longitude: listing.longitude,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Browse</h1>
        <p className="mt-1 text-gray-500">Find items to rent near you</p>
      </div>

      <BrowseSearchForm initialQuery={q} initialCategory={category} />

      <BrowseMapView listings={displayListings} />
    </div>
  )
}
