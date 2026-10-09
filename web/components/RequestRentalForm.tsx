'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  const [agreementAccepted, setAgreementAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const days = startDate && endDate ? rentalDays(startDate, endDate) : 0
  const total = days > 0 ? days * pricePerDay : 0
  const isDisabled = !startDate || !endDate || days <= 0 || !agreementAccepted || isLoading

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
      p_agreement_accepted: agreementAccepted,
    })

    setIsLoading(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    router.push(`/rentals/${data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-900/5">
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

      <div className="space-y-1.5 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
        <p>The lister is a private individual, not a trader -- the EU 14-day consumer withdrawal right doesn&apos;t apply to this booking.</p>
        <p>Rentify provides no insurance for this rental.</p>
        <p>Payment happens via Stripe Checkout once the owner approves, or directly between you and the owner if they haven&apos;t connected Stripe payouts yet.</p>
      </div>

      <label className="flex items-start gap-2.5 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={agreementAccepted}
          onChange={(e) => setAgreementAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
        />
        <span>
          I accept the{' '}
          <Link href="/rental-agreement" target="_blank" className="underline underline-offset-4 hover:text-gray-900">
            Rental Agreement
          </Link>{' '}
          for this booking.
        </span>
      </label>

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
