'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MoreVertical, Archive, ArchiveRestore } from 'lucide-react'
import type { Contact } from '@/types'

export default function ConversationHeader({
  conversationId,
  contact,
  status,
}: {
  conversationId: string
  contact: Contact | null
  status: string
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const displayName = contact?.name ?? contact?.phone ?? 'Desconocido'
  const isArchived = status === 'archived'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  return (
    <header className="px-4 py-3 border-b border-stone-200 bg-white shrink-0">
      <div className="flex items-center gap-3">
        <Link
          href="/bandeja"
          className="md:hidden flex items-center justify-center w-8 h-8 -ml-1 rounded-full hover:bg-stone-100 transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft size={18} className="text-stone-600" />
        </Link>
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-semibold shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800 truncate">{displayName}</p>
          {contact?.name && (
            <p className="text-xs text-stone-400">{contact.phone}</p>
          )}
        </div>

        {isArchived && (
          <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium shrink-0">
            Archivado
          </span>
        )}

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
    </header>
  )
}
