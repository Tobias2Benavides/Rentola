export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Track your active rentals</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Renting */}
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Renting</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-400">Active rentals</p>
        </div>

        {/* Lending */}
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Lending</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-sm text-gray-400">Active listings</p>
        </div>
      </div>

      <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16">
        <div className="text-center">
          <p className="font-semibold text-gray-700">Full dashboard coming in Phase 3</p>
          <p className="mt-1 text-sm text-gray-400">
            Rental lifecycle, requests, and history will live here.
          </p>
        </div>
      </div>
    </div>
  )
}
