'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDisabled =
    !newPassword || !confirmPassword || newPassword !== confirmPassword || isLoading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    setIsLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.push('/browse')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Update password</h1>
          <p className="mt-2 text-gray-500">Choose a new password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              New Password
            </label>
            <input
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl bg-gray-100 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-xl bg-gray-100 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={isDisabled}
            className="w-full rounded-xl bg-gray-900 py-4 font-semibold text-white transition-opacity disabled:opacity-30"
          >
            {isLoading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
