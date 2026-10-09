import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ReportReason, ReportTargetType } from '@/lib/types'

const TARGET_TYPES: ReportTargetType[] = ['listing', 'user', 'message', 'booking']
const REASONS: ReportReason[] = [
  'illegal_prohibited_item', 'stolen_item', 'scam_fraud', 'harassment',
  'fake_listing', 'safety_issue', 'ip_infringement', 'other',
]

// Single entry point for filing a report, logged in or not -- the one
// place that validates a reporter's identity before the row lands in
// public.reports, since there's no RLS insert policy on that table
// (see 015_moderation_v2.sql). Evidence photos are uploaded by the
// client directly to the report-evidence bucket first (RLS-scoped to
// the uploader's own folder); this route just records their paths.
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { targetType, targetId, reason, details, reporterEmail, evidencePaths, confirmed } = body

  if (!TARGET_TYPES.includes(targetType)) {
    return NextResponse.json({ error: 'Invalid target type' }, { status: 400 })
  }
  if (!targetId) {
    return NextResponse.json({ error: 'targetId is required' }, { status: 400 })
  }
  if (!REASONS.includes(reason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }
  if (reason === 'other' && !details?.trim()) {
    return NextResponse.json({ error: 'Details are required for "Other"' }, { status: 400 })
  }
  if (!confirmed) {
    return NextResponse.json({ error: 'You must confirm this report is accurate' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !reporterEmail?.trim()) {
    return NextResponse.json({ error: 'An email address is required when not signed in' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: report, error } = await admin
    .from('reports')
    .insert({
      reporter_id: user?.id ?? null,
      reporter_email: reporterEmail?.trim() || user?.email || null,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details?.trim() || null,
      evidence_paths: Array.isArray(evidencePaths) ? evidencePaths.slice(0, 5) : [],
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ received: true, id: report.id })
}
