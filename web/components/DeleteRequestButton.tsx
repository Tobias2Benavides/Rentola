'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleDelete() {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.from('item_requests').delete().eq('id', requestId)
    setIsLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isLoading}
      className="text-sm font-medium text-gray-500 hover:text-gray-900 disabled:opacity-30"
    >
      {isLoading ? 'Removing…' : 'Remove'}
    </button>
  )
}
