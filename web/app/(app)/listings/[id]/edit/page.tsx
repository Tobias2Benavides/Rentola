import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ListingForm from '@/components/ListingForm'
import type { Listing } from '@/lib/types'

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', params.id)
    .single<Listing>()

  if (!listing) notFound()
  if (listing.owner_id !== user!.id) redirect('/listings')

  const photos = listing.photos.map((path) => ({
    path,
    url: supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl,
  }))

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/listings" className="text-sm font-medium text-gray-500 hover:text-gray-900">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
      </div>
      <ListingForm mode="edit" listingId={listing.id} initial={{ ...listing, photos }} />
    </div>
  )
}
