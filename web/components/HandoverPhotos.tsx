'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { HandoverPhoto, HandoverStage } from '@/lib/types'

const STAGE_LABEL: Record<HandoverStage, string> = {
  pickup: 'Pickup',
  return: 'Return',
}

// Lets both rental participants upload a timestamped condition photo at
// pickup and at return (Rental Agreement Sections 2 and 4). Each person
// files their own entry for a stage -- this isn't a joint form, it's two
// independent records, which is what makes it useful evidence if the two
// accounts of the item's condition disagree later.
export default function HandoverPhotos({
  rentalId,
  stage,
  currentUserId,
}: {
  rentalId: string
  stage: HandoverStage
  currentUserId: string
}) {
  const [photos, setPhotos] = useState<HandoverPhoto[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [conditionOk, setConditionOk] = useState(true)
  const [issueDescription, setIssueDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('handover_photos')
      .select('*')
      .eq('rental_id', rentalId)
      .eq('stage', stage)
      .order('created_at', { ascending: true })
      .returns<HandoverPhoto[]>()
      .then(async ({ data }) => {
        const list = data ?? []
        setPhotos(list)
        // Private bucket -- getPublicUrl would 400 here. A signed URL is
        // the only way to read it, scoped to who the storage RLS policy
        // already lets through (see 017_rental_agreement_and_handover.sql).
        const urls: Record<string, string> = {}
        await Promise.all(
          list.map(async (p) => {
            const { data: signed } = await supabase.storage.from('handover-photos').createSignedUrl(p.photo_path, 3600)
            if (signed) urls[p.id] = signed.signedUrl
          })
        )
        setPhotoUrls(urls)
        setIsLoading(false)
      })
  }, [rentalId, stage])

  const myEntry = photos.find((p) => p.uploaded_by === currentUserId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Add a photo first')
      return
    }
    if (!conditionOk && !issueDescription.trim()) {
      setError('Describe the issue')
      return
    }

    setError(null)
    setIsSubmitting(true)
    const supabase = createClient()

    const ext = file.name.split('.').pop()
    const path = `${rentalId}/${stage}/${currentUserId}-${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('handover-photos').upload(path, file)
    if (uploadError) {
      setError(uploadError.message)
      setIsSubmitting(false)
      return
    }

    const { data: inserted, error: insertError } = await supabase
      .from('handover_photos')
      .insert({
        rental_id: rentalId,
        uploaded_by: currentUserId,
        stage,
        photo_path: path,
        condition_ok: conditionOk,
        issue_description: conditionOk ? null : issueDescription.trim(),
      })
      .select('*')
      .single<HandoverPhoto>()

    setIsSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }

    setPhotos((prev) => [...prev, inserted])
    const { data: signed } = await supabase.storage.from('handover-photos').createSignedUrl(path, 3600)
    if (signed) setPhotoUrls((prev) => ({ ...prev, [inserted.id]: signed.signedUrl }))
  }

  if (isLoading) return null

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
      <p className="font-semibold text-gray-900">{STAGE_LABEL[stage]} condition photos</p>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="space-y-1">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                {photoUrls[p.id] && <Image src={photoUrls[p.id]} alt="" fill className="object-cover" />}
              </div>
              <p className={`text-xs ${p.condition_ok ? 'text-emerald-700' : 'text-red-600'}`}>
                {p.condition_ok ? 'Condition confirmed' : `Issue noted: ${p.issue_description}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {!myEntry && (
        <form onSubmit={handleSubmit} className="space-y-2.5 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500">
            Add your own {STAGE_LABEL[stage].toLowerCase()} photo -- this protects both of you if there&apos;s a dispute later.
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-gray-600"
          />
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={conditionOk} onChange={() => setConditionOk(true)} />
              Condition confirmed
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={!conditionOk} onChange={() => setConditionOk(false)} />
              Issue noted
            </label>
          </div>
          {!conditionOk && (
            <textarea
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              rows={2}
              placeholder="Describe the issue…"
              className="w-full resize-none rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-600"
            />
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30"
          >
            {isSubmitting ? 'Uploading…' : 'Add photo'}
          </button>
        </form>
      )}
    </div>
  )
}
