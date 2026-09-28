'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface BlockUserButtonProps {
  userId: string
  userName: string
  initialIsBlocked: boolean
}

export default function BlockUserButton({ userId, userName, initialIsBlocked }: BlockUserButtonProps) {
  const router = useRouter()
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked)
  const [isLoading, setIsLoading] = useState(false)

  async function toggleBlock() {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setIsLoading(false)
      return
    }

    if (isBlocked) {
      await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', userId)
      setIsBlocked(false)
    } else {
      await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: userId })
      setIsBlocked(true)
    }
    setIsLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggleBlock}
      disabled={isLoading}
      className="text-sm font-medium text-gray-500 hover:text-gray-900 disabled:opacity-30"
    >
      {isLoading ? 'Working…' : isBlocked ? `Unblock ${userName}` : `Block ${userName}`}
    </button>
  )
}
