'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { PaymentStatus, RentalStatus } from '@/lib/types'

interface RentalActionsProps {
  rentalId: string
  status: RentalStatus
  paymentStatus: PaymentStatus
  isOwner: boolean
  isRenter: boolean
}

export default function RentalActions({ rentalId, status, paymentStatus, isOwner, isRenter }: RentalActionsProps) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function callRpc(fn: string, extraArgs: Record<string, unknown> = {}) {
    setError(null)
    setPending(fn)
    const supabase = createClient()
    const { error: rpcError } = await supabase.rpc(fn, { p_rental_id: rentalId, ...extraArgs })
    setPending(null)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    router.refresh()
  }

  async function payNow() {
    setError(null)
    setPending('pay')
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rentalId }),
    })
    const data = await res.json()
    if (!res.ok) {
      setPending(null)
      setError(data.error ?? 'Could not start checkout')
      return
    }
    window.location.href = data.url
  }

  const buttons: React.ReactNode[] = []

  if (isOwner && status === 'pending') {
    buttons.push(
      <button
        key="approve"
        onClick={() => callRpc('respond_to_rental', { p_approve: true })}
        disabled={pending !== null}
        className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-30"
      >
        {pending === 'respond_to_rental' ? 'Working…' : 'Approve'}
      </button>,
      <button
        key="decline"
        onClick={() => callRpc('respond_to_rental', { p_approve: false })}
        disabled={pending !== null}
        className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-900 disabled:opacity-30"
      >
        Decline
      </button>
    )
  }

  if (isRenter && status === 'approved' && paymentStatus === 'unpaid') {
    buttons.push(
      <button
        key="pay"
        onClick={payNow}
        disabled={pending !== null}
        className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-30"
      >
        {pending === 'pay' ? 'Redirecting…' : 'Pay Now'}
      </button>
    )
  }

  if ((isOwner || isRenter) && status === 'approved' && paymentStatus === 'paid') {
    buttons.push(
      <button
        key="handoff"
        onClick={() => callRpc('confirm_rental_handoff')}
        disabled={pending !== null}
        className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-30"
      >
        {pending === 'confirm_rental_handoff' ? 'Working…' : 'Confirm Handoff'}
      </button>
    )
  }

  if ((isOwner || isRenter) && status === 'active') {
    buttons.push(
      <button
        key="return"
        onClick={() => callRpc('confirm_rental_return')}
        disabled={pending !== null}
        className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-30"
      >
        {pending === 'confirm_rental_return' ? 'Working…' : 'Confirm Return'}
      </button>
    )
  }

  if (isRenter && paymentStatus === 'unpaid' && (status === 'pending' || status === 'approved')) {
    buttons.push(
      <button
        key="cancel"
        onClick={() => callRpc('cancel_rental')}
        disabled={pending !== null}
        className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-900 disabled:opacity-30"
      >
        Cancel Request
      </button>
    )
  }

  if (buttons.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">{buttons}</div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
