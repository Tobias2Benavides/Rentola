'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Leaflet's default marker icon resolves its PNGs relative to its own
// script path, which breaks under webpack/Next bundling. A custom inline
// SVG divIcon sidesteps that entirely -- no asset path to get wrong.
const PIN_ICON = L.divIcon({
  className: '',
  html: `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.7-6.3-14-14-14z" fill="#047857"/>
    <circle cx="14" cy="14" r="5.5" fill="white"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -32],
})

export interface MapMarker {
  id: string
  lat: number
  lng: number
  popupLabel?: string
  href?: string
  draggable?: boolean
}

interface FitBoundsProps {
  points: { lat: number; lng: number }[]
}

function FitBounds({ points }: FitBoundsProps) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15)
      return
    }
    map.fitBounds(
      points.map((p) => [p.lat, p.lng]),
      { padding: [32, 32] }
    )
  }, [map, points])
  return null
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

interface MapCoreProps {
  markers: MapMarker[]
  center?: { lat: number; lng: number }
  zoom?: number
  fitToMarkers?: boolean
  onMarkerDrag?: (id: string, lat: number, lng: number) => void
  onMapClick?: (lat: number, lng: number) => void
  heightClassName?: string
}

export default function MapCore({
  markers,
  center,
  zoom = 13,
  fitToMarkers = false,
  onMarkerDrag,
  onMapClick,
  heightClassName = 'h-72',
}: MapCoreProps) {
  const initialCenter: [number, number] = center
    ? [center.lat, center.lng]
    : markers[0]
      ? [markers[0].lat, markers[0].lng]
      : [51.5606, 5.0913]

  return (
    <div className={`${heightClassName} w-full overflow-hidden rounded-xl`}>
      <MapContainer center={initialCenter} zoom={zoom} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {fitToMarkers && <FitBounds points={markers.map((m) => ({ lat: m.lat, lng: m.lng }))} />}
        {onMapClick && <ClickHandler onMapClick={onMapClick} />}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={PIN_ICON}
            draggable={marker.draggable ?? false}
            eventHandlers={
              onMarkerDrag
                ? {
                    dragend: (e) => {
                      const latlng = e.target.getLatLng()
                      onMarkerDrag(marker.id, latlng.lat, latlng.lng)
                    },
                  }
                : undefined
            }
          >
            {marker.popupLabel && (
              <Popup>
                {marker.href ? (
                  <a href={marker.href} className="font-medium text-emerald-700 underline">
                    {marker.popupLabel}
                  </a>
                ) : (
                  marker.popupLabel
                )}
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
