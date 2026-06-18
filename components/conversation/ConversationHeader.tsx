'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MoreVertical, Archive, ArchiveRestore, Tag, X, Check, Search } from 'lucide-react'
import type { Contact, Label } from '@/types'
import { getAvatarColor } from '@/lib/avatar-color'
import { getLabelColor } from '@/lib/label-color'

export default function ConversationHeader({
  conversationId,
  contact,
  status,
  allLabels,
  initialLabelIds,
  searchQuery,
  onSearchChange,
}: {
  conversationId: string
  contact: Contact | null
  status: string
  allLabels: Label[]
  initialLabelIds: string[]
  searchQuery: string
  onSearchChange: (q: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [labelPickerOpen, setLabelPickerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [appliedLabelIds, setAppliedLabelIds] = useState<string[]>(initialLabelIds)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const displayName = contact?.name ?? contact?.phone ?? 'Desconocido'
  const isArchived = status === 'archived'
  const avatarColor = getAvatarColor(displayName)
  const appliedLabels = allLabels.filter((l) => appliedLabelIds.includes(l.id))

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus()
    }
  }, [searchOpen])

  function openSearch() {
    setSearchOpen(true)
  }

  function closeSearch() {
    setSearchOpen(false)
    onSearchChange('')
  }

  async function handleArchive() {
    setLoading(true)
    setMenuOpen(false)
    await fetch(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: isArchived ? 'active' : 'archived' }),
    })
    router.push('/bandeja')
    router.refresh()
  }

  async function toggleLabel(labelId: string) {
    const isApplied = appliedLabelIds.includes(labelId)
    setAppliedLabelIds((prev) =>
      isApplied ? prev.filter((id) => id !== labelId) : [...prev, labelId]
    )
    await fetch(`/api/conversations/${conversationId}/labels`, {
      method: isApplied ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label_id: labelId }),
    })
  }

  return (
    <>
      <header className="border-b border-stone-200 bg-white shrink-0">
        {/* Fila principal */}
        <div className="px-4 py-3 flex items-center gap-3">
          <Link
            href="/bandeja"
            className="md:hidden flex items-center justify-center w-8 h-8 -ml-1 rounded-full hover:bg-stone-100 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft size={18} className="text-stone-600" />
          </Link>

          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${avatarColor.bg} ${avatarColor.text}`}>
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-800 truncate">{displayName}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {contact?.name && (
                <p className="text-xs text-stone-400">{contact.phone}</p>
              )}
              {appliedLabels.map((label) => {
                const color = getLabelColor(label.color)
                return (
                  <span
                    key={label.id}
                    className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${color.bg} ${color.text}`}
                  >
                    {label.name}
                  </span>
                )
              })}
            </div>
          </div>

          {isArchived && (
            <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium shrink-0">
              Archivado
            </span>
          )}

          {/* Buscar */}
          <button
            onClick={openSearch}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
              searchOpen
                ? 'bg-stone-900 text-white'
                : 'hover:bg-stone-100 text-stone-500'
            }`}
            aria-label="Buscar en conversación"
          >
            <Search size={15} />
          </button>

          {/* Menú ··· */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500 transition-colors"
              aria-label="Más opciones"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-9 bg-white border border-stone-200 rounded-xl shadow-md py-1 w-48 z-20">
                <button
                  onClick={() => { setMenuOpen(false); setLabelPickerOpen(true) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  <Tag size={15} className="text-stone-400" />
                  Etiquetar
                </button>
                <button
                  onClick={handleArchive}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
                >
                  {isArchived
                    ? <><ArchiveRestore size={15} className="text-stone-400" /> Restaurar conversación</>
                    : <><Archive size={15} className="text-stone-400" /> Archivar conversación</>
                  }
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Barra de búsqueda (colapsable) */}
        {searchOpen && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
                placeholder="Buscar mensajes…"
                className="w-full pl-8 pr-3 py-2 text-sm bg-stone-100 rounded-xl border-0 outline-none focus:ring-1 focus:ring-stone-300 placeholder:text-stone-400 text-stone-800"
              />
            </div>
            <button
              onClick={closeSearch}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-500 transition-colors shrink-0"
              aria-label="Cerrar búsqueda"
            >
              <X size={15} />
            </button>
          </div>
        )}
      </header>

      {/* Label Picker */}
      {labelPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setLabelPickerOpen(false)}
          />
          <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-stone-800">Etiquetas</p>
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
