import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Free forward-geocoding proxy (address text -> lat/lng) for the listing
// location picker, backed by OpenStreetMap's Nominatim -- no API key or
// billing account, unlike Google's Geocoding API. Proxied through our own
// route (rather than called from the browser) so we control the
// identifying User-Agent Nominatim's usage policy requires, and so the
// upstream provider is swappable later without touching client code.
let lastUpstreamRequestAt = 0

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 3) {
    return NextResponse.json({ error: 'Please enter a more specific address' }, { status: 400 })
  }

  // Best-effort nod to Nominatim's "max 1 request/sec" usage policy. Not a
  // real distributed rate limiter (each serverless instance has its own
  // in-memory value) -- fine at this scale, revisit with Upstash/Redis if
  // geocoding volume ever grows enough to matter.
  const now = Date.now()
  if (now - lastUpstreamRequestAt < 1100) {
    return NextResponse.json({ error: 'Please wait a moment and try again' }, { status: 429 })
  }
  lastUpstreamRequestAt = now

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&countrycodes=nl&q=${encodeURIComponent(q)}`

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Rentify/1.0 (contact: tobiasisaac45@gmail.com)' },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Geocoding service unavailable -- try again or set your location manually' },
        { status: 502 }
      )
    }

    const results = (await upstream.json()) as { display_name: string; lat: string; lon: string }[]

    return NextResponse.json({
      results: results.map((r) => ({
        label: r.display_name,
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
      })),
    })
  } catch {
    return NextResponse.json(
      { error: 'Geocoding service unavailable -- try again or set your location manually' },
      { status: 502 }
    )
  }
}
