export default function BrowsePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Browse</h1>
        <p className="mt-1 text-gray-500">Find items to rent near you</p>
      </div>

      <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-24">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-700">Browse coming in Phase 2</p>
          <p className="mt-1 text-sm text-gray-400">
            Listings, search, and discovery will live here.
          </p>
        </div>
      </div>
    </div>
  )
}
