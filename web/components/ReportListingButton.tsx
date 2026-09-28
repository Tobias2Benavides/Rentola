'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { REPORT_REASONS } from '@/lib/reportReasons'
import type { ReportReason } from '@/lib/types'

export default function ReportListingButton({ listingId }: { listingId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [reason, setReason] = useState<ReportReason>(REPORT_REASONS[0].value)
  const [details, setDetails] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be signed in')
      setIsLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('reports').insert({
      reporter_id: user.id,
      listing_id: listingId,
      reason,
      details: details.trim() || null,
    })

    setIsLoading(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setIsDone(true)
  }

  if (isDone) {
    return <p className="text-sm text-gray-500">Thanks — we&apos;ll review this.</p>
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        Report this listing
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reason</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as ReportReason)}
          className="w-full rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-emerald-600"
        >
          {REPORT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Details (optional)</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          placeholder="What's wrong with this listing?"
          className="w-full resize-none rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
        >
          {isLoading ? 'Submitting…' : 'Submit report'}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
