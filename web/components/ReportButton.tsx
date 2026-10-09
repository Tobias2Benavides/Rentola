'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { REPORT_REASONS } from '@/lib/reportReasons'
import type { ReportReason, ReportTargetType } from '@/lib/types'

const MAX_EVIDENCE_FILES = 5

interface ReportButtonProps {
  targetType: ReportTargetType
  targetId: string
  label?: string
  currentUserEmail?: string | null
}

// Generalized report entry point -- mounted on listings, profiles,
// message threads, and bookings. Submits to /api/reports, which is the
// only path that can write a row (see 015_moderation_v2.sql: no RLS
// insert policy on reports), so this works the same whether the
// reporter is signed in or not.
export default function ReportButton({ targetType, targetId, label, currentUserEmail }: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [reason, setReason] = useState<ReportReason>(REPORT_REASONS[0].value)
  const [details, setDetails] = useState('')
  const [reporterEmail, setReporterEmail] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLoggedIn = Boolean(currentUserEmail)
  const detailsRequired = reason === 'other'
  const isDisabled =
    isLoading || !confirmed || (detailsRequired && !details.trim()) || (!isLoggedIn && !reporterEmail.trim())

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'))
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_EVIDENCE_FILES))
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()
    const evidencePaths: string[] = []

    if (isLoggedIn && files.length > 0) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        for (const file of files) {
          const ext = file.name.split('.').pop()
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`
          const { error: uploadError } = await supabase.storage.from('report-evidence').upload(path, file)
          if (!uploadError) evidencePaths.push(path)
        }
      }
    }

    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType,
        targetId,
        reason,
        details,
        reporterEmail: isLoggedIn ? undefined : reporterEmail,
        evidencePaths,
        confirmed,
      }),
    })
    const data = await res.json()

    setIsLoading(false)
    if (!res.ok) {
      setError(data.error ?? 'Could not submit report')
      return
    }
    setIsDone(true)
  }

  if (isDone) {
    return <p className="text-sm text-gray-500">Thanks — we&apos;ll review this and follow up by email if needed.</p>
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm font-medium text-gray-500 hover:text-gray-900"
      >
        {label ?? 'Report'}
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
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Details {detailsRequired ? '(required)' : '(optional)'}
        </label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          placeholder="What's wrong?"
          className="w-full resize-none rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </div>

      {isLoggedIn ? (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Evidence (optional, up to {MAX_EVIDENCE_FILES} images)
          </label>
          <input type="file" accept="image/*" multiple onChange={handleFileChange} className="text-sm text-gray-600" />
          {files.length > 0 && <p className="text-xs text-gray-400">{files.length} file(s) selected</p>}
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Your email</label>
          <input
            type="email"
            value={reporterEmail}
            onChange={(e) => setReporterEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      )}

      <label className="flex items-start gap-2 text-xs text-gray-500">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
        />
        <span>I confirm this report is accurate to the best of my knowledge.</span>
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isDisabled}
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
