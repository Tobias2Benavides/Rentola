'use client'

import { useRef, useState } from 'react'
import MapCore from './MapCoreLoader'
import { MEETUP_SPOTS } from '@/lib/meetupSpots'

export interface LocationValue {
  address: string | null
  latitude: number | null
  longitude: number | null
}

interface LocationPickerProps {
  value: LocationValue
  onChange: (value: LocationValue) => void
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [addressInput, setAddressInput] = useState(value.address ?? '')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const lastRequestAt = useRef(0)

  const hasPin = value.latitude != null && value.longitude != null

  async function handleFindOnMap() {
    const q = addressInput.trim()
    if (q.length < 3) {
      setSearchError('Enter a more specific address first')
      return
    }
    const now = Date.now()
    if (now - lastRequestAt.current < 1000) return
    lastRequestAt.current = now

    setIsSearching(true)
    setSearchError(null)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) {
        setSearchError(data.error ?? 'Something went wrong finding that address')
        return
      }
      if (!data.results || data.results.length === 0) {
        setSearchError('No match found -- try a more specific address, or pick a public spot below')
        return
      }
      const best = data.results[0]
      onChange({ address: addressInput.trim(), latitude: best.latitude, longitude: best.longitude })
    } catch {
      setSearchError('Geocoding service unavailable -- try again or pick a public spot below')
    } finally {
      setIsSearching(false)
    }
  }

  function handleMarkerDrag(_id: string, lat: number, lng: number) {
    onChange({ address: addressInput.trim() || value.address, latitude: lat, longitude: lng })
  }

  function handlePickMeetupSpot(spot: (typeof MEETUP_SPOTS)[number]) {
    setAddressInput(spot.address)
    setSearchError(null)
    onChange({ address: spot.address, latitude: spot.latitude, longitude: spot.longitude })
  }

  function handleClear() {
    onChange({ address: null, latitude: null, longitude: null })
  }

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Location <span className="font-normal normal-case text-gray-400">(optional)</span>
      </label>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Street address"
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          className="w-full rounded-xl bg-gray-100 px-4 py-3.5 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-600"
        />
        <button
          type="button"
          onClick={handleFindOnMap}
          disabled={isSearching}
          className="shrink-0 rounded-xl bg-gray-900 px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {isSearching ? 'Finding…' : 'Find on map'}
        </button>
      </div>

      {searchError && <p className="text-sm text-red-500">{searchError}</p>}

      <div className="rounded-xl bg-gray-50 p-3">
        <p className="text-xs text-gray-500">
          Don&apos;t want to share your home address? Pick a public meetup spot instead:
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MEETUP_SPOTS.map((spot) => (
            <button
              key={spot.label}
              type="button"
              onClick={() => handlePickMeetupSpot(spot)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-600 hover:text-emerald-700"
            >
              {spot.label}
            </button>
          ))}
        </div>
      </div>

      {hasPin && (
        <>
          <MapCore
            markers={[
              {
                id: 'picker',
                lat: value.latitude as number,
                lng: value.longitude as number,
                draggable: true,
              },
            ]}
            center={{ lat: value.latitude as number, lng: value.longitude as number }}
            zoom={15}
            onMarkerDrag={handleMarkerDrag}
            heightClassName="h-56"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Drag the pin to fine-tune the exact spot.</p>
            <button type="button" onClick={handleClear} className="text-xs font-medium text-gray-500 underline">
              Remove location
            </button>
          </div>
        </>
      )}
    </div>
  )
}
