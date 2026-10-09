'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { recordTermsAcceptance } from '@/lib/termsAcceptance'
import type { TermsDocument } from '@/lib/termsConfig'

interface TermsGateModalProps {
  outdatedDocuments: { document: TermsDocument; slug: string; label: string }[]
}

// Blocks the app until the signed-in user has accepted the current version
// of every click-wrap document. Shown by app/(app)/layout.tsx whenever any
// document's latest terms_acceptances row is behind CURRENT_TERMS_VERSION --
// including a brand-new user who hasn't accepted anything yet (e.g. they
// confirmed their email before a session existed at signup). Sign-out stays
// available so nobody gets stuck.
export default function TermsGateModal({ outdatedDocuments }: TermsGateModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAgree() {
    setError(null)
    setIsLoading(true)
    const supabase = createClient()
    await recordTermsAcceptance(supabase)
    setIsLoading(false)
    router.refresh()
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <div data-testid="terms-gate-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">We&apos;ve updated our terms</h2>
        <p className="text-sm text-gray-600">
          Please review and accept the current version before continuing to use Rentify:
        </p>
        <ul className="space-y-1.5">
          {outdatedDocuments.map(({ slug, label }) => (
            <li key={slug}>
              <Link
                href={slug}
                target="_blank"
                className="text-sm font-medium text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            Sign out instead
          </button>
          <button
            onClick={handleAgree}
            disabled={isLoading}
            className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-30"
          >
            {isLoading ? 'Saving…' : 'I agree'}
          </button>
        </div>
      </div>
    </div>
  )
}
