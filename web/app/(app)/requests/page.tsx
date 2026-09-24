import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DeleteRequestButton from '@/components/DeleteRequestButton'
import type { ItemRequest, Profile } from '@/lib/types'

export default async function RequestsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: requests } = await supabase
    .from('item_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<ItemRequest[]>()

  const requesterIds = Array.from(new Set((requests ?? []).map((r) => r.requester_id)))
  const { data: requesters } = requesterIds.length
    ? await supabase.from('profiles').select('id, display_name').in('id', requesterIds).returns<Pick<Profile, 'id' | 'display_name'>[]>()
    : { data: [] as Pick<Profile, 'id' | 'display_name'>[] }
  const nameById = new Map((requesters ?? []).map((p) => [p.id, p.display_name ?? 'Rentify user']))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
          <p className="mt-1 text-gray-500">Items people are looking to rent</p>
        </div>
        <Link href="/requests/new" className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          + Request an item
        </Link>
      </div>

      {!requests || requests.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-24">
          <div className="text-center">
            <p className="font-semibold text-gray-700">No requests yet</p>
            <p className="mt-1 text-sm text-gray-400">Be the first to ask for something you need.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {requests.map((request) => (
            <div key={request.id} className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{request.category}</span>
                <p className="font-semibold text-gray-900">{request.title}</p>
                <p className="text-sm text-gray-500">{request.city}</p>
              </div>
              {request.description && <p className="text-sm text-gray-700">{request.description}</p>}
              <div className="mt-auto flex items-center justify-between pt-2">
                <p className="text-xs text-gray-400">
                  {nameById.get(request.requester_id) ?? 'Rentify user'} ·{' '}
                  {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                {request.requester_id === user!.id && <DeleteRequestButton requestId={request.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
