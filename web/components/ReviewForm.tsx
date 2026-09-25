'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STAR_PATH =
  'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'

interface ReviewFormProps {
  rentalId: string
  revieweeId: string
  revieweeName: string
}

export default function ReviewForm({ rentalId, revieweeId, revieweeName }: ReviewFormProps) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be signed in')
      setIsLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('reviews').insert({
      rental_id: rentalId,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating,
      comment: comment.trim() || null,
    })

    setIsLoading(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-900/5">
      <p className="font-semibold text-gray-900">Rate {revieweeName}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-0.5"
          >
            <svg
              className={`h-7 w-7 ${star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-200'}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d={STAR_PATH} />
            </svg>
          </button>
        ))}
      </div>
      <textarea
        placeholder="Add a comment (optional)…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-600"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={rating === 0 || isLoading}
        className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-30"
      >
        {isLoading ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  )
}
