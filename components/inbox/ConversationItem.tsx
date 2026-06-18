'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bot } from 'lucide-react'
import type { ConversationWithContact } from '@/app/(dashboard)/bandeja/layout'

function formatTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })
}

export default function ConversationItem({
  conversation,
}: {
  conversation: ConversationWithContact
}) {
  const pathname = usePathname()
  const isActive = pathname === `/bandeja/${conversation.id}`
  const contact = conversation.contacts
  const displayName = contact?.name ?? contact?.phone ?? 'Desconocido'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <Link
      href={`/bandeja/${conversation.id}`}
      className={`flex items-center gap-3 px-4 py-3 border-b border-stone-100 transition-colors duration-150 ${
        isActive
          ? 'bg-emerald-50 border-l-2 border-l-emerald-500'
          : 'hover:bg-stone-50'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
          isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'
        }`}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-medium text-stone-800 truncate">{displayName}</span>
          <span className="text-xs text-stone-400 shrink-0">
            {formatTime(conversation.last_message_at)}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {conversation.mode === 'bot' && (
            <span className="inline-flex items-center gap-0.5 text-xs bg-amber-100 text-amber-600 rounded px-1.5 py-0.5 font-medium">
              <Bot size={10} />
              bot
            </span>
          )}
          {!contact?.name && (
            <span className="text-xs text-stone-400 truncate">{contact?.phone}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
