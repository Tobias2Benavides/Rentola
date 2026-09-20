'use client'

import { useState } from 'react'

export default function ConnectStripeButton({ isConnected }: { isConnected: boolean }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setIsLoading(true)
    const res = await fetch('/api/stripe/connect', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setIsLoading(false)
      setError(data.error ?? 'Could not start Stripe onboarding')
      return
    }
    window.location.href = data.url
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
      >
        {isLoading ? 'Redirecting…' : isConnected ? 'Manage Payouts' : 'Connect Payouts with Stripe'}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
