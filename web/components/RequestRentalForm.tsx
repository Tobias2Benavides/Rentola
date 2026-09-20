'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatPrice, rentalDays } from '@/lib/format'

interface BlockedRange {
  start_date: string
  end_date: string
}

function overlaps(startDate: string, endDate: string, blocked: BlockedRange): boolean {
  return startDate <= blocked.end_date && blocked.start_date <= endDate
}

export default function RequestRentalForm({
  listingId,
  pricePerDay,
  blockedDates,
}: {
  listingId: string
  pricePerDay: number
  blockedDates: BlockedRange[]
}) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const days = startDate && endDate ? rentalDays(startDate, endDate) : 0
  const total = days > 0 ? days * pricePerDay : 0
  const conflict =
    startDate && endDate ? blockedDates.find((b) => overlaps(startDate, endDate, b)) : undefined
  const isDisabled = !startDate || !endDate || days <= 0 || isLoading || Boolean(conflict)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()
    const { data, error: rpcError } = await supabase.rpc('request_rental', {
      p_listing_id: listingId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_message: message.trim(),
    })

    setIsLoading(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    router.push(`/rentals/${data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <p className="font-semibold text-gray-900">Request to rent</p>

      {blockedDates.length > 0 && (
        <div className="space-y-1 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
          <p className="font-semibold uppercase tracking-wide text-gray-400">Already booked</p>
          {blockedDates.map((b) => (
            <p key={`${b.start_date}-${b.end_date}`}>
              {formatDate(b.start_date)} – {formatDate(b.end_date)}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Start</label>
          <input
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-xl bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">End</label>
          <input
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      {conflict && (
        <p className="text-sm text-red-500">
          Those dates overlap an existing booking ({formatDate(conflict.start_date)} – {formatDate(conflict.end_date)}).
          Pick a different range.
        </p>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message (optional)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Anything the owner should know?"
          className="w-full resize-none rounded-xl bg-gray-100 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {days > 0 && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
          <span className="text-gray-500">
            {days} day{days === 1 ? '' : 's'} × {formatPrice(pricePerDay)}
          </span>
          <span className="font-semibold text-gray-900">{formatPrice(total)}</span>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isDisabled}
        className="w-full rounded-xl bg-gray-900 py-3.5 font-semibold text-white transition-opacity disabled:opacity-30"
      >
        {isLoading ? 'Sending…' : 'Send Request'}
      </button>
    </form>
  )
}
