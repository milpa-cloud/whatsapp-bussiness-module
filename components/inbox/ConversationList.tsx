'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ConversationWithContact } from '@/app/(dashboard)/bandeja/layout'
import ConversationItem from './ConversationItem'

export default function ConversationList({
  initialConversations,
}: {
  initialConversations: ConversationWithContact[]
}) {
  const [conversations, setConversations] = useState(initialConversations)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('realtime:conversations')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          setConversations((prev) =>
            prev
              .map((c) => (c.id === payload.new.id ? { ...c, ...payload.new } : c))
              .sort((a, b) => {
                const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
                const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
                return bTime - aTime
              })
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100 shrink-0">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Bandeja
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="text-xs text-slate-400 px-4 py-6 text-center">
            Sin conversaciones activas
          </p>
        ) : (
          conversations.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))
        )}
      </div>
    </div>
  )
}
