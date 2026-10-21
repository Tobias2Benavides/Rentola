// Minimal service worker -- just enough to satisfy PWA installability
// (a registered SW with a fetch handler) without caching app responses.
// Rentify's data (listings, prices, rental status, chat) changes
// constantly, so this deliberately does NOT cache pages or API calls --
// that would risk showing stale availability/prices. It only caches a
// tiny offline fallback page for when there's truly no connection.

const OFFLINE_CACHE = 'rentify-offline-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  )
})
