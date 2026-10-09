import { createClient } from '@/lib/supabase/server'
import { REPORT_REASONS } from '@/lib/reportReasons'
import ReportRow from '@/components/admin/ReportRow'
import type { Listing, Profile, Rental, Report } from '@/lib/types'

export const metadata = {
  title: 'Reports — Rentify Admin',
}

const REASON_LABELS = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label]))

export default async function AdminReportsPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = createClient()
  const status = searchParams.status ?? 'open'

  let query = supabase.from('reports').select('*').order('created_at', { ascending: false })
  if (status !== 'all') query = query.eq('status', status)
  const { data: reports } = await query.returns<Report[]>()

  const listingIds = Array.from(new Set((reports ?? []).filter((r) => r.target_type === 'listing').map((r) => r.target_id)))
  const userIds = Array.from(new Set((reports ?? []).filter((r) => r.target_type === 'user').map((r) => r.target_id)))
  const bookingIds = Array.from(new Set((reports ?? []).filter((r) => r.target_type === 'booking' || r.target_type === 'message').map((r) => r.target_id)))

  const [{ data: listings }, { data: profiles }, { data: rentals }] = await Promise.all([
    listingIds.length ? supabase.from('listings').select('id, title, owner_id').in('id', listingIds).returns<Pick<Listing, 'id' | 'title' | 'owner_id'>[]>() : Promise.resolve({ data: [] as Pick<Listing, 'id' | 'title' | 'owner_id'>[] }),
    userIds.length ? supabase.from('profiles').select('id, display_name').in('id', userIds).returns<Pick<Profile, 'id' | 'display_name'>[]>() : Promise.resolve({ data: [] as Pick<Profile, 'id' | 'display_name'>[] }),
    bookingIds.length ? supabase.from('rentals').select('id, listing_id, owner_id, renter_id').in('id', bookingIds).returns<Pick<Rental, 'id' | 'listing_id' | 'owner_id' | 'renter_id'>[]>() : Promise.resolve({ data: [] as Pick<Rental, 'id' | 'listing_id' | 'owner_id' | 'renter_id'>[] }),
  ])

  const listingById = new Map((listings ?? []).map((l) => [l.id, l]))
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))
  const rentalById = new Map((rentals ?? []).map((r) => [r.id, r]))

  function describeTarget(report: Report) {
    if (report.target_type === 'listing') {
      const listing = listingById.get(report.target_id)
      return listing ? `Listing: "${listing.title}"` : `Listing ${report.target_id}`
    }
    if (report.target_type === 'user') {
      const profile = profileById.get(report.target_id)
      return `User: ${profile?.display_name ?? report.target_id}`
    }
    const rental = rentalById.get(report.target_id)
    return rental
      ? `${report.target_type === 'booking' ? 'Booking' : 'Message thread'} for rental ${rental.id.slice(0, 8)}…`
      : `${report.target_type} ${report.target_id}`
  }

  function listingIdForReport(report: Report): string | null {
    if (report.target_type === 'listing') return report.target_id
    return null
  }

  function userIdForReport(report: Report): string | null {
    if (report.target_type === 'user') return report.target_id
    if (report.target_type === 'listing') return listingById.get(report.target_id)?.owner_id ?? null
    const rental = rentalById.get(report.target_id)
    return rental?.owner_id ?? null
  }

  const STATUS_TABS = ['open', 'reviewing', 'actioned', 'dismissed', 'all']

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      <div className="flex gap-1">
        {STATUS_TABS.map((tab) => (
          <a
            key={tab}
            href={`/admin/reports?status=${tab}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
              status === tab ? 'bg-emerald-50 text-emerald-800' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab}
          </a>
        ))}
      </div>

      {!reports || reports.length === 0 ? (
        <p className="text-sm text-gray-400">No reports here.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              reasonLabel={REASON_LABELS[report.reason] ?? report.reason}
              targetDescription={describeTarget(report)}
              listingId={listingIdForReport(report)}
              suspendableUserId={userIdForReport(report)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
