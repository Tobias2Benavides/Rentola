import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { HANDOVER_PHOTO_RETENTION_MONTHS, CLOSED_REPORT_RETENTION_MONTHS } from '@/lib/retention'

function monthsAgo(months: number): string {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() - months)
  return d.toISOString()
}

// Runs on the same CRON_SECRET-gated Vercel Cron pattern as
// return-reminders (see vercel.json). Enforces the two retention
// periods the Privacy Policy promises: handover photos deleted a
// fixed time after the rental they document ends, and closed reports
// anonymized a fixed time after resolution. Both periods are
// placeholders in lib/retention.ts pending operator/lawyer sign-off.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const photoCutoff = monthsAgo(HANDOVER_PHOTO_RETENTION_MONTHS)
  const reportCutoff = monthsAgo(CLOSED_REPORT_RETENTION_MONTHS)

  // Handover photos: join through rentals to find ones whose rental ended
  // before the cutoff (retention is "time since the rental ended", not
  // "time since the photo was taken").
  const { data: expiredRentals } = await admin
    .from('rentals')
    .select('id')
    .lt('end_date', photoCutoff.slice(0, 10))

  let deletedPhotos = 0
  if (expiredRentals && expiredRentals.length > 0) {
    const rentalIds = expiredRentals.map((r) => r.id)
    const { data: photos } = await admin
      .from('handover_photos')
      .select('id, photo_path')
      .in('rental_id', rentalIds)

    if (photos && photos.length > 0) {
      await admin.storage.from('handover-photos').remove(photos.map((p) => p.photo_path))
      await admin.from('handover_photos').delete().in('id', photos.map((p) => p.id))
      deletedPhotos = photos.length
    }
  }

  // Closed reports: anonymize rather than delete, so moderation history
  // and aggregate stats survive without keeping the reporter's identity
  // or evidence photos indefinitely.
  const { data: closedReports } = await admin
    .from('reports')
    .select('id, evidence_paths')
    .in('status', ['actioned', 'dismissed'])
    .lt('resolved_at', reportCutoff)

  let anonymizedReports = 0
  if (closedReports && closedReports.length > 0) {
    const evidencePaths = closedReports.flatMap((r) => r.evidence_paths ?? [])
    if (evidencePaths.length > 0) {
      await admin.storage.from('report-evidence').remove(evidencePaths)
    }
    // reports has a check constraint requiring reporter_id or
    // reporter_email -- a sentinel string keeps it satisfied while still
    // removing the real identity.
    await admin
      .from('reports')
      .update({ reporter_id: null, reporter_email: 'anonymized', details: null, evidence_paths: [] })
      .in('id', closedReports.map((r) => r.id))
    anonymizedReports = closedReports.length
  }

  return NextResponse.json({ deletedPhotos, anonymizedReports })
}
