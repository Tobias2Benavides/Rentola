'use client'

import dynamic from 'next/dynamic'

// Leaflet touches `window`/`navigator` at import time, so it can only ever
// load on the client. Every consumer imports this file instead of
// MapCore.tsx directly, so this SSR boundary only has to be handled once.
const MapCore = dynamic(() => import('./MapCore'), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse rounded-xl bg-gray-100" />,
})

export default MapCore
export type { MapMarker } from './MapCore'
