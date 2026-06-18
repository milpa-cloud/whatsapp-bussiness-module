'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bot, Archive, MailOpen } from 'lucide-react'
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

const SWIPE_THRESHOLD = 60

export default function ConversationItem({
  conversation,
}: {
  conversation: ConversationWithContact
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = pathname === `/bandeja/${conversation.id}`
  const contact = conversation.contacts
  const displayName = contact?.name ?? contact?.phone ?? 'Desconocido'
  const initial = displayName.charAt(0).toUpperCase()

  const [offsetX, setOffsetX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = null
    setSwiping(true)
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    if (isHorizontal.current === null) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy)
    }
    if (!isHorizontal.current) return

    e.preventDefault()
    // Limitar: izquierda hasta -100, derecha hasta 80
    setOffsetX(Math.max(-100, Math.min(80, dx)))
  }

  function onTouchEnd() {
    setSwiping(false)
    if (offsetX < -SWIPE_THRESHOLD) {
      handleArchive()
    } else if (offsetX > SWIPE_THRESHOLD) {
      handleMarkUnread()
    }
    setOffsetX(0)
    isHorizontal.current = null
  }

  async function handleArchive() {
    await fetch(`/api/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: conversation.status === 'archived' ? 'active' : 'archived' }),
    })
    router.refresh()
  }

  async function handleMarkUnread() {
    // Por ahora solo da feedback visual — la lógica de no leído se implementa con Semana 2 de auth
    router.refresh()
  }

  const showLeft = offsetX < -10   // arrastrando izquierda → archivar
  const showRight = offsetX > 10   // arrastrando derecha → no leído

  return (
    <div className="relative overflow-hidden">
      {/* Fondo izquierda (archivar) */}
      <div className={`absolute inset-y-0 right-0 w-24 flex items-center justify-center bg-stone-600 transition-opacity ${showLeft ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-col items-center gap-1">
          <Archive size={16} className="text-white" />
          <span className="text-white text-xs">Archivar</span>
        </div>
      </div>

      {/* Fondo derecha (no leído) */}
      <div className={`absolute inset-y-0 left-0 w-24 flex items-center justify-center bg-emerald-500 transition-opacity ${showRight ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-col items-center gap-1">
          <MailOpen size={16} className="text-white" />
          <span className="text-white text-xs">No leído</span>
        </div>
      </div>

      {/* Item */}
      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 200ms ease-out',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <Link
          href={`/bandeja/${conversation.id}`}
          className={`flex items-center gap-3 px-4 py-3 border-b border-stone-100 transition-colors duration-150 bg-white ${
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
      </div>
    </div>
  )
}
