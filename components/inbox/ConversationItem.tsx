'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Trash2, Tag, X, Check } from 'lucide-react'
import type { ConversationWithContact } from '@/app/(dashboard)/bandeja/layout'
import type { Label } from '@/types'
import { getAvatarColor } from '@/lib/avatar-color'
import { getLabelColor } from '@/lib/label-color'

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

const REVEAL_LEFT = -120
const REVEAL_RIGHT = 80

export default function ConversationItem({
  conversation,
  allLabels,
}: {
  conversation: ConversationWithContact
  allLabels: Label[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = pathname === `/bandeja/${conversation.id}`
  const contact = conversation.contacts
  const displayName = contact?.name ?? contact?.phone ?? 'Desconocido'
  const initial = displayName.charAt(0).toUpperCase()
  const isArchived = conversation.status === 'archived'
  const unread = conversation.unread_count ?? 0
  const preview = conversation.last_message_preview
  const avatarColor = getAvatarColor(displayName)

  // Swipe
  const [offsetX, setOffsetX] = useState(0)
  const [revealedLeft, setRevealedLeft] = useState(false)
  const [revealedRight, setRevealedRight] = useState(false)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)

  // Labels
  const initialLabelIds = (conversation.conversation_labels ?? []).map((cl) => cl.label_id)
  const [appliedLabelIds, setAppliedLabelIds] = useState<string[]>(initialLabelIds)
  const [labelPickerOpen, setLabelPickerOpen] = useState(false)

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
    const base = revealedLeft ? REVEAL_LEFT : revealedRight ? REVEAL_RIGHT : 0
    setOffsetX(Math.max(REVEAL_LEFT, Math.min(REVEAL_RIGHT, base + dx)))
  }

  function onTouchEnd() {
    setSwiping(false)
    isHorizontal.current = null
    if (offsetX <= REVEAL_LEFT / 2) {
      setOffsetX(REVEAL_LEFT)
      setRevealedLeft(true)
      setRevealedRight(false)
    } else if (offsetX >= REVEAL_RIGHT / 2) {
      setOffsetX(REVEAL_RIGHT)
      setRevealedRight(true)
      setRevealedLeft(false)
    } else {
      setOffsetX(0)
      setRevealedLeft(false)
      setRevealedRight(false)
    }
  }

  function close() {
    setOffsetX(0)
    setRevealedLeft(false)
    setRevealedRight(false)
  }

  async function handleArchive() {
    close()
    await fetch(`/api/conversations/${conversation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: isArchived ? 'active' : 'archived' }),
    })
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta conversación? Se borrarán todos los mensajes.')) return
    close()
    await fetch(`/api/conversations/${conversation.id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function handleOpen() {
    if (revealedLeft || revealedRight) { close(); return }
    if (unread > 0) {
      fetch(`/api/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unread_count: 0 }),
      })
    }
  }

  function openLabelPicker() {
    close()
    setLabelPickerOpen(true)
  }

  async function toggleLabel(labelId: string) {
    const isApplied = appliedLabelIds.includes(labelId)
    setAppliedLabelIds((prev) =>
      isApplied ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    )
    await fetch(`/api/conversations/${conversation.id}/labels`, {
      method: isApplied ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label_id: labelId }),
    })
  }

  const appliedLabels = allLabels.filter((l) => appliedLabelIds.includes(l.id))

  return (
    <>
      <div className="relative overflow-hidden select-none">
        {/* Panel izquierdo visible en swipe derecha: Etiquetar */}
        <div className="absolute inset-y-0 left-0 w-[80px] flex items-stretch">
          <button
            onClick={openLabelPicker}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 transition-colors"
          >
            <Tag size={16} className="text-white" />
            <span className="text-white text-xs">Etiquetar</span>
          </button>
        </div>

        {/* Panel derecho visible en swipe izquierda: Archivar + Eliminar */}
        <div className="absolute inset-y-0 right-0 w-[120px] flex items-stretch">
          <button
            onClick={handleArchive}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-stone-500 hover:bg-stone-600 transition-colors"
          >
            {isArchived
              ? <><ArchiveRestore size={16} className="text-white" /><span className="text-white text-xs">Restaurar</span></>
              : <><Archive size={16} className="text-white" /><span className="text-white text-xs">Archivar</span></>
            }
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-red-500 hover:bg-red-600 transition-colors"
          >
            <Trash2 size={16} className="text-white" />
            <span className="text-white text-xs">Eliminar</span>
          </button>
        </div>

        {/* Item deslizable */}
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
            onClick={(revealedLeft || revealedRight) ? (e) => { e.preventDefault(); close() } : handleOpen}
            className={`flex items-center gap-3 px-4 py-3 border-b border-stone-100 bg-white transition-colors duration-150 ${
              isActive ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : 'hover:bg-stone-50'
            }`}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColor.bg} ${avatarColor.text}`}>
                {initial}
              </div>
              {unread > 0 && !isActive && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </div>

            {/* Contenido */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className={`text-sm truncate ${unread > 0 && !isActive ? 'font-semibold text-stone-900' : 'font-medium text-stone-800'}`}>
                  {displayName}
                </span>
                <span className="text-xs text-stone-400 shrink-0" suppressHydrationWarning>
                  {formatTime(conversation.last_message_at)}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5 overflow-hidden">
                {appliedLabels.slice(0, 2).map((label) => {
                  const color = getLabelColor(label.color)
                  return (
                    <span
                      key={label.id}
                      className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full ${color.bg} ${color.text}`}
                    >
                      {label.name}
                    </span>
                  )
                })}
                {preview ? (
                  <span className={`text-xs truncate ${unread > 0 && !isActive ? 'text-stone-600 font-medium' : 'text-stone-400'}`}>
                    {preview}
                  </span>
                ) : (
                  !contact?.name && (
                    <span className="text-xs text-stone-400 truncate">{contact?.phone}</span>
                  )
                )}
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Label Picker — bottom sheet */}
      {labelPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setLabelPickerOpen(false)}
          />
          <div className="relative w-full bg-white rounded-t-2xl p-5 pb-8 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-stone-800">
                Etiquetas — {displayName}
              </p>
              <button
                onClick={() => setLabelPickerOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {allLabels.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-4">
                Sin etiquetas — crea una desde tu perfil
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allLabels.map((label) => {
                  const applied = appliedLabelIds.includes(label.id)
                  const color = getLabelColor(label.color)
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        applied
                          ? `${color.bg} ${color.text} ring-2 ring-offset-1 ring-current`
                          : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                    >
                      {applied && <Check size={12} />}
                      {label.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
