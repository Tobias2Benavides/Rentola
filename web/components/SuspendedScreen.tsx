'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Full-screen block for a suspended account -- replaces the entire app
// shell (no NavBar, no listing/renting access) but still lets the user
// sign out and see why, per Terms Section 9's "how to contest" promise.
export default function SuspendedScreen({ reason }: { reason: string | null }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Your account is suspended</h1>
        {reason && <p className="text-gray-600">Reason: {reason}</p>}
        <p className="text-sm text-gray-500">
          If you believe this is a mistake, email{' '}
          <a href="mailto:[CONTACT_EMAIL]" className="text-emerald-700 underline underline-offset-4">
            [CONTACT_EMAIL]
          </a>{' '}
          to contest it. See also our{' '}
          <a href="/contact" className="text-emerald-700 underline underline-offset-4">
            Contact &amp; Legal Info
          </a>{' '}
          page.
        </p>
        <button
          onClick={handleSignOut}
          className="rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-200"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
