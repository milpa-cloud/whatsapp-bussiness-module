'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types'

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const isYesterday =
    date.toDateString() === new Date(Date.now() - 86400000).toDateString()
  if (isToday) return 'Hoy'
  if (isYesterday) return 'Ayer'
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function MessageThread({
  conversationId,
  initialMessages,
}: {
  conversationId: string
  initialMessages: Message[]
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, supabase])

  // Agrupar mensajes por día para mostrar separadores de fecha
  const grouped: { label: string; messages: Message[] }[] = []
  for (const msg of messages) {
    const label = formatDateLabel(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.label === label) {
      last.messages.push(msg)
    } else {
      grouped.push({ label, messages: [msg] })
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
      {grouped.map(({ label, messages: dayMsgs }) => (
        <div key={label}>
          <div className="flex items-center justify-center my-3">
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
              {label}
            </span>
          </div>
          <div className="space-y-1">
            {dayMsgs.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl px-4 py-2 ${
                    msg.direction === 'outbound'
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 rounded-bl-sm shadow-sm border border-slate-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>
                  <p
                    className={`text-xs mt-1 text-right ${
                      msg.direction === 'outbound' ? 'text-emerald-200' : 'text-slate-400'
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
