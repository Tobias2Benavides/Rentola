'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/lib/types'

export default function Chat({ rentalId, currentUserId }: { rentalId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('messages')
      .select('*')
      .eq('rental_id', rentalId)
      .order('created_at', { ascending: true })
      .returns<Message[]>()
      .then(({ data }) => setMessages(data ?? []))

    const channel = supabase
      .channel(`messages:${rentalId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `rental_id=eq.${rentalId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [rentalId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return

    setIsSending(true)
    const supabase = createClient()
    const { error } = await supabase.from('messages').insert({ rental_id: rentalId, sender_id: currentUserId, body })
    setIsSending(false)
    if (!error) setDraft('')
  }

  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="font-semibold text-gray-900">Messages</p>
      </div>

      <div className="flex h-64 flex-col gap-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && <p className="m-auto text-sm text-gray-400">No messages yet — say hello.</p>}
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  isMine ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                {m.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-gray-100 p-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 rounded-xl bg-gray-100 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-30"
        >
          Send
        </button>
      </form>
    </div>
  )
}
