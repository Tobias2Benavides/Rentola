'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Installability just degrades gracefully if this fails -- not worth
        // surfacing to the user.
      })
    }
  }, [])

  return null
}
