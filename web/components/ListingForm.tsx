'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/categories'
import type { Listing } from '@/lib/types'

const MAX_PHOTOS = 5

interface ExistingPhoto {
  path: string
  url: string
}

interface ListingFormProps {
  mode: 'create' | 'edit'
  listingId?: string
  initial?: Pick<Listing, 'title' | 'description' | 'category' | 'price_per_day' | 'price_per_week' | 'city'> & {
    photos: ExistingPhoto[]
  }
}

export default function ListingForm({ mode, listingId, initial }: ListingFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0])
  const [pricePerDay, setPricePerDay] = useState(initial?.price_per_day?.toString() ?? '')
  const [pricePerWeek, setPricePerWeek] = useState(initial?.price_per_week?.toString() ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>(initial?.photos ?? [])
  const [newFiles, setNewFiles] = useState<{ file: File; preview: string }[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPhotos = existingPhotos.length + newFiles.length
  const isDisabled = !title || !city || !pricePerDay || totalPhotos === 0 || isLoading

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const room = MAX_PHOTOS - totalPhotos
    const accepted = files.slice(0, room)
    setNewFiles((prev) => [...prev, ...accepted.map((file) => ({ file, preview: URL.createObjectURL(file) }))])
    e.target.value = ''
  }

  function removeExisting(path: string) {
    setExistingPhotos((prev) => prev.filter((p) => p.path !== path))
  }

  function removeNew(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
  }

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

    const uploadedPaths: string[] = []
    for (const { file } of newFiles) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('listing-photos').upload(path, file)
      if (uploadError) {
        setError(uploadError.message)
        setIsLoading(false)
        return
      }
      uploadedPaths.push(path)
    }

    const photos = [...existingPhotos.map((p) => p.path), ...uploadedPaths]

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      category,
      price_per_day: parseFloat(pricePerDay),
      price_per_week: pricePerWeek ? parseFloat(pricePerWeek) : null,
      city: city.trim(),
      photos,
    }

    if (mode === 'create') {
      const { data, error: insertError } = await supabase
        .from('listings')
        .insert({ ...payload, owner_id: user.id })
        .select('id')
        .single()

      setIsLoading(false)
      if (insertError) {
        setError(insertError.message)
        return
      }
      router.push(`/browse/${data.id}`)
      router.refresh()
    } else {
      const { error: updateError } = await supabase.from('listings').update(payload).eq('id', listingId)

      setIsLoading(false)
      if (updateError) {
        setError(updateError.message)
        return
      }
      router.push('/listings')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photos */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Photos ({totalPhotos}/{MAX_PHOTOS})
        </label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {existingPhotos.map((photo) => (
            <div key={photo.path} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
              <Image src={photo.url} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeExisting(photo.path)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
              >
                ✕
              </button>
            </div>
          ))}
          {newFiles.map((f, i) => (
            <div key={f.preview} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
              <Image src={f.preview} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeNew(i)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
              >
                ✕
              </button>
            </div>
          ))}
          {totalPhotos < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500"
            >
              +
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Title</label>
        <input
          type="text"
          placeholder="e.g. Electric pressure washer"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl bg-gray-100 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Description</label>
        <textarea
          placeholder="Condition, what's included, pickup instructions…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-xl bg-gray-100 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl bg-gray-100 px-4 py-3.5 text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Price */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Price / day</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="15.00"
            value={pricePerDay}
            onChange={(e) => setPricePerDay(e.target.value)}
            className="w-full rounded-xl bg-gray-100 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Price / week (optional)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="80.00"
            value={pricePerWeek}
            onChange={(e) => setPricePerWeek(e.target.value)}
            className="w-full rounded-xl bg-gray-100 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* City */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">City</label>
        <input
          type="text"
          placeholder="e.g. Austin, TX"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full rounded-xl bg-gray-100 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isDisabled}
        className="w-full rounded-xl bg-gray-900 py-4 font-semibold text-white transition-opacity disabled:opacity-30"
      >
        {isLoading ? 'Saving…' : mode === 'create' ? 'Publish Listing' : 'Save Changes'}
      </button>
    </form>
  )
}
