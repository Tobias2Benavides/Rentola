'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, type Category } from '@/lib/categories'
import { CITIES } from '@/lib/cities'

export default function RequestForm() {
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>(CATEGORIES[0])
  const [city, setCity] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDisabled = !title || !city || isLoading

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

    const { error: insertError } = await supabase.from('item_requests').insert({
      requester_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      category,
      city: city.trim(),
    })

    setIsLoading(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    router.push('/requests')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">What do you need?</label>
        <input
          type="text"
          placeholder="e.g. Projector for a weekend"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl bg-gray-100 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Details (optional)</label>
        <textarea
          placeholder="When you need it, any specifics that matter…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-xl bg-gray-100 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-600"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="w-full rounded-xl bg-gray-100 px-4 py-3.5 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-600"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">City</label>
        <input
          type="text"
          list="city-options"
          placeholder="Start typing a city…"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full rounded-xl bg-gray-100 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <datalist id="city-options">
          {CITIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isDisabled}
        className="w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 py-4 font-semibold text-white transition disabled:opacity-30"
      >
        {isLoading ? 'Posting…' : 'Post Request'}
      </button>
    </form>
  )
}
