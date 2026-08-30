import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-gray-900">Rentify</span>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="max-w-2xl text-5xl font-bold leading-tight tracking-tight text-gray-900">
          Rent anything from people nearby
        </h1>
        <p className="mt-6 max-w-lg text-lg text-gray-500">
          Rentify connects people who have things with people who need them — for a day, a week, or however long you need.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            href="/sign-up"
            className="rounded-2xl bg-gray-900 px-8 py-4 text-base font-semibold text-white shadow-sm"
          >
            Start renting
          </Link>
          <Link
            href="/sign-in"
            className="rounded-2xl border border-gray-200 px-8 py-4 text-base font-semibold text-gray-700"
          >
            Sign in
          </Link>
        </div>

        {/* Feature list */}
        <div className="mt-20 grid max-w-2xl gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Find nearby</p>
              <p className="mt-0.5 text-sm text-gray-500">Browse items available close to you</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Pick your dates</p>
              <p className="mt-0.5 text-sm text-gray-500">Choose exactly when you need it</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
              <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Built on trust</p>
              <p className="mt-0.5 text-sm text-gray-500">Ratings and reviews after every rental</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
