'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, rentalDays } from '@/lib/format'
import AvailabilityCalendar from '@/components/AvailabilityCalendar'

interface BlockedRange {
  start_date: string
  end_date: string
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

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const days = startDate && endDate ? rentalDays(startDate, endDate) : 0
  const total = days > 0 ? days * pricePerDay : 0
  const isDisabled = !startDate || !endDate || days <= 0 || isLoading

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

      <AvailabilityCalendar
        blockedDates={blockedDates}
        startDate={startDate}
        endDate={endDate}
        onChange={(s, e) => {
          setStartDate(s)
          setEndDate(e)
        }}
      />

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message (optional)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Anything the owner should know?"
          className="w-full resize-none rounded-xl bg-gray-100 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-600"
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
        className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 py-3.5 font-semibold text-white transition disabled:opacity-30"
      >
        {isLoading ? 'Sending…' : 'Send Request'}
      </button>
    </form>
  )
}
