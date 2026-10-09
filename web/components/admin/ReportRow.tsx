'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/format'
import type { Report } from '@/lib/types'

const STATUS_STYLES: Record<Report['status'], string> = {
  open: 'bg-yellow-100 text-yellow-800',
  reviewing: 'bg-blue-100 text-blue-800',
  actioned: 'bg-emerald-100 text-emerald-800',
  dismissed: 'bg-gray-100 text-gray-500',
}

interface ReportRowProps {
  report: Report
  reasonLabel: string
  targetDescription: string
  listingId: string | null
  suspendableUserId: string | null
}

export default function ReportRow({ report, reasonLabel, targetDescription, listingId, suspendableUserId }: ReportRowProps) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<{ error: { message: string } | null }>, key: string) {
    setError(null)
    setPending(key)
    const { error } = await fn()
    setPending(null)
    if (error) {
      setError(error.message)
      return
    }
    router.refresh()
  }

  async function markReviewing() {
    const supabase = createClient()
    await run(async () => {
      const { error } = await supabase.rpc('resolve_report', { p_report_id: report.id, p_status: 'reviewing', p_resolution_note: note })
      return { error }
    }, 'reviewing')
  }

  async function dismiss() {
    const supabase = createClient()
    await run(async () => {
      const { error } = await supabase.rpc('resolve_report', { p_report_id: report.id, p_status: 'dismissed', p_resolution_note: note })
      return { error }
    }, 'dismiss')
  }

  async function removeListingAndAction() {
    const supabase = createClient()
    if (!listingId) return
    await run(async () => {
      const { error: removeError } = await supabase.rpc('remove_listing', {
        p_listing_id: listingId,
        p_reason: note || reasonLabel,
        p_based_on_report_id: report.id,
      })
      if (removeError) return { error: removeError }
      return supabase.rpc('resolve_report', { p_report_id: report.id, p_status: 'actioned', p_resolution_note: note })
    }, 'remove-listing')
  }

  async function suspendUser(permanent: boolean) {
    const supabase = createClient()
    if (!suspendableUserId) return
    await run(async () => {
      const { error: suspendError } = await supabase.rpc('suspend_user', {
        p_user_id: suspendableUserId,
        p_reason: note || reasonLabel,
        p_permanent: permanent,
        p_based_on_report_id: report.id,
      })
      if (suspendError) return { error: suspendError }
      return supabase.rpc('resolve_report', { p_report_id: report.id, p_status: 'actioned', p_resolution_note: note })
    }, permanent ? 'suspend-permanent' : 'suspend-temporary')
  }

  const isResolved = report.status === 'actioned' || report.status === 'dismissed'

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{targetDescription}</p>
          <p className="text-sm text-gray-500">{reasonLabel}</p>
          {report.details && <p className="mt-1 text-sm text-gray-600">&ldquo;{report.details}&rdquo;</p>}
          <p className="mt-1 text-xs text-gray-400">
            Reported by {report.reporter_email ?? report.reporter_id ?? 'unknown'} on{' '}
            {formatDateTime(report.created_at)}
          </p>
          {report.evidence_paths.length > 0 && (
            <p className="text-xs text-gray-400">{report.evidence_paths.length} evidence file(s) attached</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[report.status]}`}>
          {report.status}
        </span>
      </div>

      {report.resolution_note && (
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">Note: {report.resolution_note}</p>
      )}

      {!isResolved && (
        <div className="space-y-2 border-t border-gray-100 pt-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Note (used for the status change and, where applicable, the user's notification)"
            className="w-full resize-none rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-600"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={markReviewing}
              disabled={pending !== null}
              className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-900 disabled:opacity-30"
            >
              {pending === 'reviewing' ? 'Working…' : 'Mark reviewing'}
            </button>
            <button
              onClick={dismiss}
              disabled={pending !== null}
              className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-900 disabled:opacity-30"
            >
              {pending === 'dismiss' ? 'Working…' : 'Dismiss'}
            </button>
            {listingId && (
              <button
                onClick={removeListingAndAction}
                disabled={pending !== null}
                className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-30"
              >
                {pending === 'remove-listing' ? 'Working…' : 'Remove listing'}
              </button>
            )}
            {suspendableUserId && (
              <>
                <button
                  onClick={() => suspendUser(false)}
                  disabled={pending !== null}
                  className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-30"
                >
                  {pending === 'suspend-temporary' ? 'Working…' : 'Suspend user (temporary)'}
                </button>
                <button
                  onClick={() => suspendUser(true)}
                  disabled={pending !== null}
                  className="rounded-xl bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800 disabled:opacity-30"
                >
                  {pending === 'suspend-permanent' ? 'Working…' : 'Suspend user (permanent)'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
