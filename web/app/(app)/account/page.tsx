'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AccountSettingsPage() {
  const router = useRouter()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setError(null)
    setIsDeleting(true)

    const res = await fetch('/api/account/delete', { method: 'POST' })
    const data = await res.json()

    if (!res.ok) {
      setIsDeleting(false)
      setError(data.error ?? 'Could not delete account')
      return
    }

    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Account settings</h1>

      <div className="space-y-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5">
        <p className="font-semibold text-gray-900">Download my data</p>
        <p className="text-sm text-gray-500">
          Get a copy of your profile, listings, bookings, messages you&apos;ve sent, reviews, reports you&apos;ve
          filed, and terms acceptances, as a JSON file.
        </p>
        <a
          href="/api/account/export"
          download
          className="inline-block rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Download my data
        </a>
      </div>

      <div className="space-y-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5">
        <p className="font-semibold text-gray-900">Delete my account</p>
        <p className="text-sm text-gray-500">
          This removes your personal details (name, bio, photo, payment instructions) and deactivates your
          listings. You can&apos;t sign back in afterward. Blocked while you have a pending, approved, or active
          rental — finish or cancel it first. Some records (past bookings and reviews involving other users, or
          anything needed for an open dispute or a legal obligation) are kept in anonymized form rather than
          deleted outright, so your history doesn&apos;t erase another user&apos;s.
        </p>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {!isConfirming ? (
          <button
            onClick={() => setIsConfirming(true)}
            className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-2 rounded-xl bg-red-50 p-3">
            <p className="text-sm font-semibold text-red-800">Are you sure? This can&apos;t be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
              >
                {isDeleting ? 'Deleting…' : 'Yes, delete my account'}
              </button>
              <button
                onClick={() => setIsConfirming(false)}
                disabled={isDeleting}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
