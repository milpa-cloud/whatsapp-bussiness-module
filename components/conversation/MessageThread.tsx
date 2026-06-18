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

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightText(text: string, query: string) {
  if (!query.trim()) return <>{text}</>
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-stone-900 rounded-sm">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  )
}

function renderMedia(mediaUrl: string, isOutbound: boolean) {
  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(mediaUrl)
  const isVideo = /\.mp4$/i.test(mediaUrl)
  const isAudio = /\.(ogg|mp3|m4a|aac)$/i.test(mediaUrl)

  if (isImage) {
    return (
      <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={mediaUrl}
          alt="Imagen"
          className="rounded-xl max-w-full object-cover"
          style={{ maxHeight: 280 }}
        />
      </a>
    )
  }
  if (isVideo) {
    return (
      <video controls className="rounded-xl max-w-full" style={{ maxHeight: 280 }}>
        <source src={mediaUrl} />
      </video>
    )
  }
  if (isAudio) {
    return (
      <audio controls className="w-full max-w-xs">
        <source src={mediaUrl} />
      </audio>
    )
  }
  return (
    <a
      href={mediaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 text-sm underline ${isOutbound ? 'text-emerald-100' : 'text-stone-600'}`}
    >
      📄 Ver archivo
    </a>
  )
}

export default function MessageThread({
  conversationId,
  initialMessages,
  searchQuery = '',
}: {
  conversationId: string
  initialMessages: Message[]
  searchQuery?: string
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const isSearching = searchQuery.trim().length > 0

  useEffect(() => {
    if (!isSearching) bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [isSearching])

  useEffect(() => {
    if (!isSearching) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isSearching])

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

  const visibleMessages = isSearching
    ? messages.filter((m) =>
        m.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages

  const grouped: { label: string; messages: Message[] }[] = []
  for (const msg of visibleMessages) {
    const label = formatDateLabel(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last?.label === label) {
      last.messages.push(msg)
    } else {
      grouped.push({ label, messages: [msg] })
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-stone-50">
      {/* Banner de resultados */}
      {isSearching && (
        <div className="flex items-center justify-center mb-2">
          <span className="text-xs text-stone-400 bg-stone-100 px-3 py-1 rounded-full">
            {visibleMessages.length === 0
              ? 'Sin resultados'
              : `${visibleMessages.length} ${visibleMessages.length === 1 ? 'mensaje' : 'mensajes'}`}
          </span>
        </div>
      )}

      {grouped.map(({ label, messages: dayMsgs }) => (
        <div key={label}>
          <div className="flex items-center justify-center my-3">
            <span className="text-xs text-stone-400 bg-stone-100 px-3 py-1 rounded-full">
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
                      : 'bg-white text-stone-800 rounded-bl-sm border border-stone-100'
                  }`}
                >
                  {msg.media_url && renderMedia(msg.media_url, msg.direction === 'outbound')}
                  {msg.content && (
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {highlightText(msg.content, searchQuery)}
                    </p>
                  )}
                  {!msg.media_url && !msg.content && (
                    <p className="text-sm text-stone-400 italic">Mensaje sin contenido</p>
                  )}
                  <p
                    className={`text-xs mt-1 text-right ${
                      msg.direction === 'outbound' ? 'text-emerald-200' : 'text-stone-400'
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
