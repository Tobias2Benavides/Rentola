import Link from 'next/link'
import ListingForm from '@/components/ListingForm'

export default function NewListingPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/listings" className="text-sm font-medium text-gray-500 hover:text-gray-900">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">List an Item</h1>
      </div>
      <ListingForm mode="create" />
    </div>
  )
}
